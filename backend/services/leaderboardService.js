import mongoose from 'mongoose';

import XPTransaction from '../models/XPTransaction.js';
import Attendance from '../models/Attendance.js';
import Event from '../models/Event.js';
import Club from '../models/Club.js';
import User from '../models/User.js';

import {
  periodWindow,
  CLUB_SCORED_TYPES,
  ATTENDANCE_TYPES,
  XP_TYPES,
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_MAX_LIMIT,
  RANK_SCAN_CAP
} from '../config/xpRules.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Search boxes accept arbitrary text; without escaping, a "(" in the query
// throws inside the aggregation.
const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeLimit = (limit) => {
  const parsed = Number(limit);

  if (!Number.isFinite(parsed) || parsed < 1) return LEADERBOARD_DEFAULT_LIMIT;

  return Math.min(Math.floor(parsed), LEADERBOARD_MAX_LIMIT);
};

const normalizePage = (page) => {
  const parsed = Number(page);

  if (!Number.isFinite(parsed) || parsed < 1) return 1;

  return Math.floor(parsed);
};

const windowMatch = (window) => {
  if (!window.start && !window.end) return {};

  const range = {};
  if (window.start) range.$gte = window.start;
  if (window.end) range.$lt = window.end;

  return { createdAt: range };
};

// Students only. Admins and club leaders appear in rankings too - they attend
// events like anyone else - but accounts with no student identity are excluded
// from "the campus leaderboard" only when they are staff accounts.
const STUDENT_ROLES = ['student', 'club_member', 'club_leader'];

// Resolves the search and department filters against the User collection
// first. Both are indexed there, and turning them into an id list lets the
// transaction scan keep using its own indexes.
// A client can send search[foo]=1, which arrives as an object even after the
// operator sanitizer prunes it. Filters are text or nothing.
const asText = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveUserFilter = async ({ department, search, studentRolesOnly }) => {
  const match = {};

  const dept = asText(department);

  if (dept && dept !== 'all') {
    match.department = dept;
  }

  const needle = asText(search);

  if (needle) {
    // Deliberately not email: matching on it would let anyone confirm that a
    // given address belongs to a ranked student.
    const pattern = new RegExp(escapeRegex(needle), 'i');
    match.$or = [
      { name: pattern },
      { studentId: pattern },
      { department: pattern }
    ];
  }

  if (studentRolesOnly) {
    match.role = { $in: STUDENT_ROLES };
  }

  if (!Object.keys(match).length) return null;

  const found = await User.find(match).select('_id').lean();

  return found.map((user) => user._id);
};

const publicUserFields = 'name department studentId profilePic role year course';

const attachProfiles = async (rows) => {
  if (!rows.length) return rows;

  const users = await User.find({ _id: { $in: rows.map((row) => row.userId) } })
    .select(publicUserFields)
    .lean();

  const byId = new Map(users.map((user) => [String(user._id), user]));

  return rows
    .map((row) => {
      const profile = byId.get(String(row.userId));

      // A deleted account can still have ledger rows; it must not appear as a
      // blank name on the public board.
      if (!profile) return null;

      return { ...row, profile };
    })
    .filter(Boolean);
};

// Per-row activity counts for the students actually on the page.
const attachActivityCounts = async (rows) => {
  if (!rows.length) return rows;

  const ids = rows.map((row) => row.userId);

  const [attended, wins, entries] = await Promise.all([
    Attendance.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]),
    XPTransaction.aggregate([
      {
        $match: {
          user: { $in: ids },
          type: XP_TYPES.COMPETITION_WIN,
          amount: { $gt: 0 }
        }
      },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]),
    XPTransaction.aggregate([
      {
        $match: {
          user: { $in: ids },
          type: XP_TYPES.COMPETITION_PARTICIPATION,
          amount: { $gt: 0 }
        }
      },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ])
  ]);

  const countMap = (list) =>
    new Map(list.map((row) => [String(row._id), row.count]));

  const attendedMap = countMap(attended);
  const winMap = countMap(wins);
  const entryMap = countMap(entries);

  return rows.map((row) => ({
    ...row,
    eventsAttended: attendedMap.get(String(row.userId)) || 0,
    competitionsWon: winMap.get(String(row.userId)) || 0,
    competitionsEntered: entryMap.get(String(row.userId)) || 0
  }));
};

// Competition ranking: equal XP shares a place and the next student skips
// ahead. Index-based ranks would make two students on 120 XP finish 4th and 5th,
// which reads as a bug to every student who checks the board.
const withCompetitionRanks = (sortedRows) => {
  let previousXp = null;
  let previousRank = 0;

  return sortedRows.map((row, index) => {
    const rank = previousXp === row.totalXp ? previousRank : index + 1;

    previousXp = row.totalXp;
    previousRank = rank;

    return { ...row, rank };
  });
};

export const studentLeaderboard = async ({
  period = 'overall',
  semesterKey = null,
  department = null,
  search = null,
  page = 1,
  limit = LEADERBOARD_DEFAULT_LIMIT,
  viewerId = null
} = {}) => {
  const window = periodWindow(period, new Date(), semesterKey);
  const pageSize = normalizeLimit(limit);
  const currentPage = normalizePage(page);

  const userIds = await resolveUserFilter({
    department,
    search,
    studentRolesOnly: true
  });

  if (userIds && userIds.length === 0) {
    return {
      window,
      page: currentPage,
      limit: pageSize,
      totalEntries: 0,
      totalPages: 1,
      entries: [],
      myRank: await rankOf(viewerId, window)
    };
  }

  const match = { ...windowMatch(window) };

  if (userIds) match.user = { $in: userIds };

  const groupPipeline = [
    { $match: match },
    { $group: { _id: '$user', totalXp: { $sum: '$amount' }, awards: { $sum: 1 } } },
    { $match: { totalXp: { $gt: 0 } } },
    { $sort: { totalXp: -1, _id: 1 } }
  ];

  // Materialising the whole prefix through the requested page keeps ranks exact
  // for everything shown, including ties that straddle a page boundary, while
  // the separate $count stays a full-collection number so pagination stays
  // correct past the cap.
  const [rows] = await XPTransaction.aggregate([
    ...groupPipeline,
    { $limit: Math.min(currentPage * pageSize, RANK_SCAN_CAP) },
    {
      $facet: {
        prefix: [],
        meta: [{ $count: 'scanned' }]
      }
    }
  ]);

  const ranked = withCompetitionRanks(
    rows.prefix.map((row) => ({
      userId: row._id,
      totalXp: row.totalXp,
      awards: row.awards
    }))
  ).slice((currentPage - 1) * pageSize);

  const [counted] = await XPTransaction.aggregate([
    ...groupPipeline,
    { $count: 'total' }
  ]);

  const totalEntries = counted?.total || 0;
  const scannedAll = totalEntries <= RANK_SCAN_CAP;

  const entries = await attachActivityCounts(
    await attachProfiles(ranked)
  );

  return {
    window,
    page: currentPage,
    limit: pageSize,
    totalEntries,
    totalPages: Math.max(1, Math.ceil(totalEntries / pageSize)),
    // Past the scan cap a page can only be counted from the top, so ties in
    // that tail are reported positionally rather than silently wrong.
    ranksExact: scannedAll || currentPage * pageSize <= RANK_SCAN_CAP,
    entries,
    myRank: await rankOf(viewerId, window)
  };
};

// Two indexed passes: the viewer's own total, then how many students beat it.
export const rankOf = async (userId, window) => {
  if (!userId) return null;

  const uid = oid(userId);
  const base = windowMatch(window);

  const [mine] = await XPTransaction.aggregate([
    { $match: { ...base, user: uid } },
    { $group: { _id: null, totalXp: { $sum: '$amount' } } }
  ]);

  const totalXp = mine?.totalXp || 0;

  if (totalXp <= 0) {
    const [participants] = await XPTransaction.aggregate([
      { $match: base },
      { $group: { _id: '$user', t: { $sum: '$amount' } } },
      { $match: { t: { $gt: 0 } } },
      { $count: 'total' }
    ]);

    return {
      rank: null,
      totalXp: 0,
      rankedStudents: participants?.total || 0,
      period: window.period
    };
  }

  const [ahead] = await XPTransaction.aggregate([
    { $match: base },
    { $group: { _id: '$user', totalXp: { $sum: '$amount' } } },
    { $match: { totalXp: { $gt: totalXp } } },
    { $count: 'better' }
  ]);

  const [counted] = await XPTransaction.aggregate([
    { $match: base },
    { $group: { _id: '$user', t: { $sum: '$amount' } } },
    { $match: { t: { $gt: 0 } } },
    { $count: 'total' }
  ]);

  return {
    rank: (ahead?.better || 0) + 1,
    totalXp,
    rankedStudents: counted?.total || 0,
    period: window.period
  };
};

export const clubLeaderboard = async ({
  period = 'overall',
  semesterKey = null,
  search = null,
  department = null,
  page = 1,
  limit = LEADERBOARD_DEFAULT_LIMIT
} = {}) => {
  const window = periodWindow(period, new Date(), semesterKey);
  const pageSize = normalizeLimit(limit);
  const currentPage = normalizePage(page);

  const clubFilter = {};

  const dept = asText(department);

  if (dept && dept !== 'all') {
    clubFilter.$or = [{ department: dept }, { category: dept }];
  }

  const needle = asText(search);

  if (needle) {
    clubFilter.clubName = new RegExp(escapeRegex(needle), 'i');
  }

  const clubs = Object.keys(clubFilter).length
    ? await Club.find(clubFilter).select('_id').lean()
    : null;

  if (clubs && clubs.length === 0) {
    return {
      window,
      page: currentPage,
      limit: pageSize,
      totalEntries: 0,
      totalPages: 1,
      entries: []
    };
  }

  const match = {
    ...windowMatch(window),
    type: { $in: CLUB_SCORED_TYPES },
    club: { $ne: null }
  };

  if (clubs) match.club = { $in: clubs.map((club) => club._id) };

  const rows = await XPTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$club',
        totalXp: { $sum: '$amount' },
        participants: { $addToSet: '$user' },
        awards: { $sum: 1 }
      }
    },
    { $match: { totalXp: { $gt: 0 } } },
    { $sort: { totalXp: -1, _id: 1 } },
    // The whole prefix through the requested page, so a tie that straddles the
    // boundary keeps the same place on both pages.
    { $limit: Math.min(currentPage * pageSize, RANK_SCAN_CAP) }
  ]);

  const scored = withCompetitionRanks(rows).slice((currentPage - 1) * pageSize);

  const [counted] = await XPTransaction.aggregate([
    { $match: match },
    { $group: { _id: '$club', totalXp: { $sum: '$amount' } } },
    { $match: { totalXp: { $gt: 0 } } },
    { $count: 'total' }
  ]);

  const ids = scored.map((row) => row._id);

  const [clubDocs, eventCounts] = await Promise.all([
    Club.find({ _id: { $in: ids } })
      .select('clubName description category department logo members admin')
      .populate('admin', 'name')
      .lean(),
    ids.length
      ? Event.aggregate([
          { $match: { club: { $in: ids } } },
          { $group: { _id: '$club', events: { $sum: 1 } } }
        ])
      : Promise.resolve([])
  ]);

  const byId = new Map(clubDocs.map((club) => [String(club._id), club]));
  const eventsMap = new Map(
    eventCounts.map((row) => [String(row._id), row.events])
  );

  const entries = scored
    .map((row) => {
      const club = byId.get(String(row._id));

      // A club deleted since its awards were written keeps ledger rows but no
      // document; it must not appear as a blank name on the board.
      if (!club) return null;

      return {
        rank: row.rank,
        clubId: club._id,
        totalXp: row.totalXp,
        awards: row.awards,
        participation: row.participants?.length || 0,
        club: {
          id: club._id,
          name: club.clubName,
          description: club.description,
          category: club.category || 'General',
          department: club.department || club.category || 'General',
          logo: club.logo || null,
          members: club.members?.length || 0,
          leader: club.admin?.name || null
        },
        eventsOrganized: eventsMap.get(String(club._id)) || 0
      };
    })
    .filter(Boolean);

  const totalEntries = counted?.total || 0;

  return {
    window,
    page: currentPage,
    limit: pageSize,
    totalEntries,
    totalPages: Math.max(1, Math.ceil(totalEntries / pageSize)),
    entries
  };
};

// One club's standing next to the clubs immediately around it, which is what
// "how are we doing compared to last month's rival" actually needs.
export const clubComparison = async (clubId, { period = 'overall' } = {}) => {
  const window = periodWindow(period, new Date(), null);

  const board = await clubLeaderboard({ period, limit: LEADERBOARD_MAX_LIMIT });
  const index = board.entries.findIndex(
    (row) => String(row.clubId) === String(clubId)
  );

  const club = await Club.findById(clubId)
    .select('clubName description category department logo members admin')
    .populate('admin', 'name')
    .lean();

  if (!club) return null;

  const events = await Event.find({ club: clubId })
    .select('title date status category activityType participants')
    .sort({ date: -1 })
    .lean();

  const contributors = await XPTransaction.aggregate([
    {
      $match: {
        club: oid(clubId),
        type: { $in: CLUB_SCORED_TYPES },
        ...windowMatch(window)
      }
    },
    { $group: { _id: '$user', totalXp: { $sum: '$amount' } } },
    { $sort: { totalXp: -1 } },
    { $limit: 10 },
    { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'profile'
      } },
    { $unwind: '$profile' },
    {
      $project: {
        totalXp: 1,
        name: '$profile.name',
        department: '$profile.department',
        profilePic: '$profile.profilePic'
      }
    }
  ]);

  const attended = await XPTransaction.aggregate([
    {
      $match: {
        club: oid(clubId),
        type: { $in: ATTENDANCE_TYPES }
      }
    },
    { $group: { _id: null, sessions: { $sum: 1 } } }
  ]);

  return {
    window,
    club: {
      id: club._id,
      name: club.clubName,
      description: club.description,
      category: club.category || 'General',
      department: club.department || club.category || 'General',
      logo: club.logo || null,
      members: club.members?.length || 0,
      leader: club.admin?.name || null
    },
    rank: index >= 0 ? board.entries[index].rank : null,
    totalXp: index >= 0 ? board.entries[index].totalXp : 0,
    participation: index >= 0 ? board.entries[index].participation : 0,
    rankedClubs: board.entries.length,
    eventsOrganized: events.length,
    attendanceSessions: attended[0]?.sessions || 0,
    ahead: index > 0 ? board.entries[index - 1] : null,
    behind:
      index >= 0 && index < board.entries.length - 1
        ? board.entries[index + 1]
        : null,
    recentEvents: events.slice(0, 5),
    topContributors: contributors
  };
};

export const gamificationAnalytics = async () => {
  const since = new Date(Date.now() - 30 * 86400000);

  const [byType, totals, daily, departments, awards] = await Promise.all([
    XPTransaction.aggregate([
      { $group: { _id: '$type', xp: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { xp: -1 } }
    ]),
    XPTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalXp: { $sum: '$amount' },
          transactions: { $sum: 1 },
          students: { $addToSet: '$user' }
        }
      }
    ]),
    XPTransaction.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          xp: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    XPTransaction.aggregate([
      { $group: { _id: '$user', totalXp: { $sum: '$amount' } } },
      { $match: { totalXp: { $gt: 0 } } },
      { $limit: 5000 },
      { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'profile'
        } },
      { $unwind: '$profile' },
      {
        $group: {
          _id: { $ifNull: ['$profile.department', 'Unassigned'] },
          students: { $sum: 1 },
          xp: { $sum: '$totalXp' }
        }
      },
      { $sort: { xp: -1 } },
      { $limit: 12 }
    ]),
    XPTransaction.countDocuments({ source: 'admin' })
  ]);

  const summary = totals[0] || { totalXp: 0, transactions: 0, students: [] };

  return {
    generatedAt: new Date().toISOString(),
    totalXp: summary.totalXp || 0,
    totalTransactions: summary.transactions || 0,
    scoredStudents: summary.students?.length || 0,
    manualAwards: awards,
    byType: byType.map((row) => ({
      type: row._id,
      xp: row.xp,
      count: row.count
    })),
    last30Days: daily.map((row) => ({
      date: row._id,
      xp: row.xp,
      count: row.count
    })),
    byDepartment: departments.map((row) => ({
      department: row._id,
      students: row.students,
      xp: row.xp
    }))
  };
};

export const departmentsForFilter = async () => {
  const found = await User.aggregate([
    { $match: { role: { $in: STUDENT_ROLES } } },
    { $group: { _id: '$department' } },
    { $match: { _id: { $nin: [null, ''] } } },
    { $sort: { _id: 1 } }
  ]);

  return found.map((row) => row._id);
};

// Export needs the whole board rather than one page, and a report the admin
// cannot read in a spreadsheet is not a report.
export const leaderboardRows = async ({
  scope = 'students',
  period = 'overall',
  semesterKey = null
}) => {
  const all = [];
  const pageSize = LEADERBOARD_MAX_LIMIT;

  let page = 1;

  // Walking pages keeps memory bounded on a large campus instead of pulling
  // every row into one aggregation result.
  for (;;) {
    const board =
      scope === 'clubs'
        ? await clubLeaderboard({ period, semesterKey, page, limit: pageSize })
        : await studentLeaderboard({ period, semesterKey, page, limit: pageSize });

    all.push(...board.entries);

    if (
      !board.entries.length ||
      all.length >= board.totalEntries ||
      page * pageSize >= RANK_SCAN_CAP
    ) {
      break;
    }

    page += 1;
  }

  if (scope === 'clubs') {
    return all.map((row) => ({
      rank: row.rank,
      name: row.club.name,
      department: row.club.department,
      totalXp: row.totalXp,
      eventsOrganized: row.eventsOrganized,
      members: row.club.members,
      participation: row.participation
    }));
  }

  return all.map((row) => ({
    rank: row.rank,
    name: row.profile?.name || '',
    studentId: row.profile?.studentId || '',
    department: row.profile?.department || '',
    totalXp: row.totalXp,
    eventsAttended: row.eventsAttended,
    competitionsWon: row.competitionsWon
  }));
};
