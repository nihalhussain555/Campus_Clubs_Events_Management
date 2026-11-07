import mongoose from 'mongoose';

import User from '../models/User.js';
import Club from '../models/Club.js';
import Event from '../models/Event.js';
import Attendance from '../models/Attendance.js';
import XPTransaction from '../models/XPTransaction.js';
import Achievement from '../models/Achievement.js';
import StudentBadge from '../models/StudentBadge.js';
import Gamification from '../models/Gamification.js';

import { canManageEvent } from '../middleware/permissions.js';
import { ROLES } from '../middleware/authMiddleware.js';

import {
  awardXp,
  reverseXp,
  evaluateAchievements,
  computeStudentMetrics,
  rebuildProjection,
  getActiveAchievements,
  ensureAchievementCatalog,
  attendanceIdempotencyKey
} from '../services/xpService.js';

import {
  studentLeaderboard,
  clubLeaderboard,
  clubComparison,
  rankOf,
  gamificationAnalytics,
  departmentsForFilter,
  leaderboardRows
} from '../services/leaderboardService.js';

import { backfillAttendanceXp } from '../services/attendanceRewardService.js';

import {
  periodWindow,
  XP_TYPES,
  XP_RULES,
  MANUAL_AWARD_TYPES,
  ATTENDANCE_TYPES,
  ACHIEVEMENT_METRICS,
  periods,
  semesterWindows,
  levelBreakdown,
  xpRulesView,
  MAX_REASON_LENGTH,
  LEADERBOARD_MAX_LIMIT,
  ACTIVITY_TYPES
} from '../config/xpRules.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

// The client's axios interceptor reads `message`, so every failure path has to
// populate it or the UI falls back to a generic error and the student never
// learns that they were already registered, say.
const fail = (res, error, fallback) => {
  console.error(fallback, error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.statusCode && error.message
        ? error.message
        : fallback
  });
};

const cleanPeriod = (value) =>
  periods.includes(value) ? value : 'overall';

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value));

// ---------------------------------------------------------------- config

export const getGamificationRules = async (req, res) => {
  try {
    const catalog = await getActiveAchievements();

    return res.status(200).json({
      success: true,
      xpRules: xpRulesView(),
      activityTypes: Object.values(ACTIVITY_TYPES),
      awardTypes: MANUAL_AWARD_TYPES,
      metrics: Object.values(ACHIEVEMENT_METRICS),
      periods,
      semesters: semesterWindows(3),
      achievements: catalog.map((badge) => ({
        slug: badge.slug,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        metric: badge.metric,
        threshold: badge.threshold,
        xpBonus: badge.xpBonus,
        active: badge.active
      }))
    });
  } catch (error) {
    return fail(res, error, 'Failed to load gamification rules');
  }
};

// ---------------------------------------------------------------- leaderboards

export const getStudentLeaderboard = async (req, res) => {
  try {
    const board = await studentLeaderboard({
      period: cleanPeriod(req.query.period),
      semesterKey: req.query.semester || null,
      department: req.query.department || null,
      search: req.query.search || null,
      page: req.query.page,
      limit: req.query.limit,
      viewerId: req.user.id
    });

    const departments = await departmentsForFilter();

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      window: {
        period: board.window.period,
        label: board.window.label,
        start: board.window.start,
        end: board.window.end
      },
      page: board.page,
      limit: board.limit,
      totalEntries: board.totalEntries,
      totalPages: board.totalPages,
      ranksExact: board.ranksExact,
      myRank: board.myRank,
      departments,
      entries: board.entries.map((row) => {
        const level = levelBreakdown(row.totalXp);

        return {
          rank: row.rank,
          userId: row.userId,
          name: row.profile.name,
          department: row.profile.department || null,
          studentId: row.profile.studentId || null,
          profilePic: row.profile.profilePic || null,
          totalXp: row.totalXp,
          eventsAttended: row.eventsAttended,
          competitionsWon: row.competitionsWon,
          competitionsEntered: row.competitionsEntered,
          level: level.level,
          levelTitle: level.title
        };
      })
    });
  } catch (error) {
    return fail(res, error, 'Failed to load the student leaderboard');
  }
};

export const getClubLeaderboard = async (req, res) => {
  try {
    const board = await clubLeaderboard({
      period: cleanPeriod(req.query.period),
      semesterKey: req.query.semester || null,
      search: req.query.search || null,
      department: req.query.department || null,
      page: req.query.page,
      limit: req.query.limit
    });

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      window: {
        period: board.window.period,
        label: board.window.label,
        start: board.window.start,
        end: board.window.end
      },
      page: board.page,
      limit: board.limit,
      totalEntries: board.totalEntries,
      totalPages: board.totalPages,
      entries: board.entries
    });
  } catch (error) {
    return fail(res, error, 'Failed to load the club leaderboard');
  }
};

export const getClubStanding = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'Invalid club id');
    }

    const standing = await clubComparison(req.params.id, {
      period: cleanPeriod(req.query.period)
    });

    if (!standing) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    return res.status(200).json({ success: true, ...standing });
  } catch (error) {
    return fail(res, error, 'Failed to load club standings');
  }
};

// ---------------------------------------------------------------- dashboard

// Everything the student gamification card needs, in one round trip: score,
// rank in every window, level progress, badges earned and locked with their
// progress, and the recent ledger.
export const getMyGamification = async (req, res) => {
  try {
    const userId = req.user.id;

    const metrics = await computeStudentMetrics(userId);
    const totalXp = metrics[ACHIEVEMENT_METRICS.TOTAL_XP];

    const catalog = await getActiveAchievements();

    const earned = await StudentBadge.find({ user: oid(userId) })
      .populate('achievement', 'title description icon metric threshold xpBonus sortOrder')
      .sort({ earnedAt: -1 })
      .lean();

    const earnedBySlug = new Map(
      earned
        .filter((badge) => badge.achievement)
        .map((badge) => [badge.slug, badge])
    );

    const badges = catalog.map((badge) => {
      const record = earnedBySlug.get(badge.slug);
      const value = metrics[badge.metric] ?? 0;

      return {
        slug: badge.slug,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        metric: badge.metric,
        threshold: badge.threshold,
        xpBonus: badge.xpBonus,
        value,
        progressPercent: Math.min(
          100,
          Math.round((value / badge.threshold) * 100)
        ),
        earned: Boolean(record),
        earnedAt: record?.earnedAt || null
      };
    });

    const locked = badges.filter((badge) => !badge.earned);

    const nextAchievement = locked.length
      ? locked.reduce(
          (closest, badge) =>
            badge.progressPercent > closest.progressPercent ? badge : closest,
          locked[0]
        )
      : null;

    const windows = ['overall', 'weekly', 'monthly', 'semester'].map(
      (period) => periodWindow(period, new Date(), req.query.semester || null)
    );

    const rankResults = await Promise.all(
      windows.map((window) => rankOf(userId, window))
    );

    const ranks = rankResults.reduce((acc, rank, index) => {
      acc[windows[index].period] = rank;

      return acc;
    }, {});

    const recentActivity = await XPTransaction.find({ user: oid(userId) })
      .populate('event', 'title date activityType')
      .populate('club', 'clubName')
      .select('type amount reason source event club createdAt achievement')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const byType = await XPTransaction.aggregate([
      { $match: { user: oid(userId) } },
      { $group: { _id: '$type', xp: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const projection = await Gamification.findOne({ user: oid(userId) })
      .select('totalXp updatedAt')
      .lean();

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      xp: {
        total: totalXp,
        byType: byType.map((row) => ({
          type: row._id,
          xp: row.xp,
          count: row.count
        })),
        level: levelBreakdown(totalXp)
      },
      ranks,
      metrics,
      badges,
      nextAchievement,
      recentAchievements: earned.slice(0, 4).map((badge) => ({
        title: badge.achievement.title,
        icon: badge.achievement.icon,
        earnedAt: badge.earnedAt
      })),
      recentActivity,
      // A non-zero gap means the cached projection and the ledger disagree;
      // the admin recompute endpoint is the fix.
      projectionDriftXp: projection
        ? Math.abs((projection.totalXp || 0) - totalXp)
        : totalXp
    });
  } catch (error) {
    return fail(res, error, 'Failed to load your gamification summary');
  }
};

export const getMyXpHistory = async (req, res) => {
  try {
    const isAdmin = req.user.effectiveRole === ROLES.ADMIN;

    const requested = req.query.userId;

    if (requested && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only an administrator can read another student ledger'
      });
    }

    if (requested && !isObjectId(requested)) {
      return badRequest(res, 'Invalid student id');
    }

    const userId = requested || req.user.id;

    const limit = Math.min(
      Number(req.query.limit) || 25,
      LEADERBOARD_MAX_LIMIT
    );
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [rows, total] = await Promise.all([
      XPTransaction.find({ user: oid(userId) })
        .populate('event', 'title date activityType')
        .populate('club', 'clubName')
        .populate('awardedBy', 'name')
        .select('type amount reason source event club awardedBy createdAt achievement reverses reversedBy')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      XPTransaction.countDocuments({ user: oid(userId) })
    ]);

    return res.status(200).json({
      success: true,
      userId,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      entries: rows.map((row) => ({
        ...row,
        // The name of whoever adjusted your score is useful; their other
        // account details are not.
        awardedBy: row.awardedBy
          ? { id: row.awardedBy._id, name: row.awardedBy.name }
          : null
      }))
    });
  } catch (error) {
    return fail(res, error, 'Failed to load XP history');
  }
};

// ---------------------------------------------------------------- awards

// Admins award anyone, anywhere, including negative adjustments. Club leaders
// may only credit students within an event they run, and only at the published
// rate for that activity - a leader who could set any number could inflate
// their own club up the board.
export const awardPoints = async (req, res) => {
  try {
    const {
      userId,
      userIds,
      type,
      amount,
      reason,
      eventId,
      idempotencyKey
    } = req.body || {};

    if (!MANUAL_AWARD_TYPES.includes(type)) {
      return badRequest(
        res,
        `type must be one of: ${MANUAL_AWARD_TYPES.join(', ')}`
      );
    }

    const targets = (
      Array.isArray(userIds) && userIds.length ? userIds : [userId]
    )
      .filter(Boolean)
      .map(String);

    if (!targets.length) {
      return badRequest(res, 'At least one student is required');
    }

    if (targets.length > 50) {
      return badRequest(res, 'A single award can cover at most 50 students');
    }

    if (targets.some((id) => !isObjectId(id))) {
      return badRequest(res, 'One of the student ids is not valid');
    }

    if (!reason || !String(reason).trim()) {
      return badRequest(res, 'A reason is required for every manual award');
    }

    const trimmedReason = String(reason).trim().slice(0, MAX_REASON_LENGTH);

    const isAdmin = req.user.effectiveRole === ROLES.ADMIN;

    let resolvedAmount = amount;

    if (isAdmin) {
      if (amount !== undefined && amount !== null && amount !== '') {
        resolvedAmount = Number(amount);

        if (!Number.isFinite(resolvedAmount) || resolvedAmount === 0) {
          return badRequest(res, 'amount must be a non-zero number');
        }
      }
    } else {
      // A club leader acting on their own event.
      if (!eventId) {
        return res.status(403).json({
          success: false,
          message:
            'Club leaders can only award points against an event they run'
        });
      }

      if (type === XP_TYPES.MANUAL_ADJUSTMENT) {
        return res.status(403).json({
          success: false,
          message: 'Only an administrator can make a point adjustment'
        });
      }

      if (amount !== undefined && amount !== null && amount !== '') {
        return res.status(403).json({
          success: false,
          message:
            'Club leaders award the published rate for each activity. Only an ' +
            'administrator can set a custom point value.'
        });
      }

      if (!(await canManageEvent(req.user, eventId))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not run this event.'
        });
      }

      resolvedAmount = XP_RULES[type];
    }

    let event = null;

    if (eventId) {
      if (!isObjectId(eventId)) {
        return badRequest(res, 'Invalid event id');
      }

      event = await Event.findById(eventId).select('title club activityType');

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
    }

    const students = await User.find({ _id: { $in: targets.map(oid) } })
      .select('_id name')
      .lean();

    if (students.length !== new Set(targets).size) {
      return badRequest(res, 'One or more students no longer exist');
    }

    if (
      type === XP_TYPES.MANUAL_ADJUSTMENT &&
      !Number.isFinite(Number(amount))
    ) {
      return badRequest(
        res,
        'A manual adjustment needs an explicit amount, positive or negative'
      );
    }

    const awarded = [];
    const skipped = [];

    for (const student of students) {
      // A verified check-in already writes its own award, keyed to the
      // Attendance row. A hand credit for the same activity is booked under
      // that same key, so it either collapses against the award the check-in
      // made, or settles an attendance the check-in failed to pay. It can
      // never become a second payment for one seat.
      let key = idempotencyKey || null;
      let viaAttendance = false;

      if (!key && eventId && ATTENDANCE_TYPES.includes(type)) {
        const attendanceRow = await Attendance.findOne({
          event: eventId,
          user: student._id
        }).select('_id');

        if (attendanceRow) {
          key = attendanceIdempotencyKey(attendanceRow._id);
          viaAttendance = true;
        }
      }

      // An event-bound award gets a deterministic key, so repeating the scan,
      // pressing the button twice, or calling this endpoint instead of the
      // winners endpoint all collapse to the same ledger row.
      const result = await awardXp({
        user: student._id,
        type,
        amount: resolvedAmount,
        reason: trimmedReason,
        event: event?._id || null,
        club: event?.club || null,
        awardedBy: req.user.id,
        source: 'admin',
        idempotencyKey:
          key || (event ? `manual:${type}:${event._id}:${student._id}` : undefined)
      });

      if (result.duplicated) {
        skipped.push({
          userId: student._id,
          name: student.name,
          reason: viaAttendance
            ? 'Attendance for that event has already been credited'
            : 'An identical award is already recorded'
        });

        continue;
      }

      await evaluateAchievements(student._id);

      awarded.push({
        userId: student._id,
        name: student.name,
        amount: result.transaction.amount
      });
    }

    return res.status(awarded.length ? 201 : 409).json({
      success: true,
      message: awarded.length
        ? `Awarded ${awarded.length} student${awarded.length === 1 ? '' : 's'}`
        : 'Every student in that list was already awarded',
      awarded,
      skipped
    });
  } catch (error) {
    return fail(res, error, 'Failed to award points');
  }
};

export const reverseAward = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'Invalid XP entry id');
    }

    const reason = req.body?.reason
      ? String(req.body.reason).trim().slice(0, MAX_REASON_LENGTH)
      : null;

    const { transaction } = await reverseXp(req.params.id, {
      awardedBy: req.user.id,
      reason: reason || 'Reversed by administrator'
    });

    await evaluateAchievements(transaction.user);

    return res.status(200).json({
      success: true,
      message: 'XP entry reversed',
      reversal: {
        id: transaction._id,
        amount: transaction.amount,
        totalXpAfter: (
          await XPTransaction.aggregate([
            { $match: { user: transaction.user } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
        )[0]?.total || 0
      }
    });
  } catch (error) {
    return fail(res, error, 'Failed to reverse the XP entry');
  }
};

// ---------------------------------------------------------------- event credits

// Judged results are not derivable from attendance, so an organiser declares
// them here. Each winner is credited once per event.
export const recordWinners = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!(await canManageEvent(req.user, eventId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not run this event.'
      });
    }

    const ids = (Array.isArray(req.body?.userIds) ? req.body.userIds : [])
      .filter(Boolean)
      .map(String);

    if (!ids.length) {
      return badRequest(res, 'Provide at least one winner');
    }

    if (ids.length > 50) {
      return badRequest(res, 'A single result can cover at most 50 winners');
    }

    if (ids.some((id) => !isObjectId(id))) {
      return badRequest(res, 'One of the student ids is not valid');
    }

    const event = await Event.findById(eventId).select(
      'title club registeredStudents participants status'
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const onRoster = new Set([
      ...event.registeredStudents.map(String),
      ...event.participants.map(String)
    ]);

    // Winners must have been entered for the event; otherwise a leader could
    // hand 50 XP to a friend who never showed up.
    const ineligible = ids.filter((id) => !onRoster.has(id));

    if (ineligible.length) {
      return res.status(400).json({
        success: false,
        message: `${ineligible.length} student(s) are not registered for this event`,
        ineligible
      });
    }

    const awarded = [];
    const skipped = [];

    for (const id of ids) {
      const result = await awardXp({
        user: id,
        type: XP_TYPES.COMPETITION_WIN,
        reason: `Winner - ${event.title}`,
        event: event._id,
        club: event.club,
        awardedBy: req.user.id,
        source: 'admin',
        idempotencyKey: `manual:${XP_TYPES.COMPETITION_WIN}:${event._id}:${id}`
      });

      if (result.duplicated) {
        skipped.push(id);
        continue;
      }

      await evaluateAchievements(id);
      awarded.push(id);
    }

    return res.status(201).json({
      success: true,
      message: `${awarded.length} winner(s) recorded`,
      awarded,
      skipped
    });
  } catch (error) {
    return fail(res, error, 'Failed to record competition winners');
  }
};

// Organising credit goes to the club leader who ran the event, plus anyone the
// organiser names as a co-organiser. Paid once per event per person.
export const creditOrganizers = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!(await canManageEvent(req.user, eventId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not run this event.'
      });
    }

    const event = await Event.findById(eventId).select(
      'title club date status organizerCreditedAt'
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const club = await Club.findById(event.club).select('admin');

    if (!club) {
      return badRequest(res, 'The club that ran this event no longer exists');
    }

    const extra = (Array.isArray(req.body?.userIds) ? req.body.userIds : [])
      .filter(Boolean)
      .map(String);

    if (extra.some((id) => !isObjectId(id))) {
      return badRequest(res, 'One of the organiser ids is not valid');
    }

    const organizers = [...new Set([String(club.admin), ...extra])];

    const awarded = [];
    const skipped = [];

    for (const id of organizers) {
      const result = await awardXp({
        user: id,
        type: XP_TYPES.EVENT_ORGANIZING,
        reason: `Organised ${event.title}`,
        event: event._id,
        club: club._id,
        awardedBy: req.user.id,
        source: 'admin',
        idempotencyKey: `manual:${XP_TYPES.EVENT_ORGANIZING}:${event._id}:${id}`
      });

      if (result.duplicated) {
        skipped.push(id);
        continue;
      }

      await evaluateAchievements(id);
      awarded.push(id);
    }

    if (!event.organizerCreditedAt) {
      await Event.updateOne(
        { _id: event._id },
        { $set: { organizerCreditedAt: new Date() } }
      );
    }

    return res.status(201).json({
      success: true,
      message: `${awarded.length} organiser(s) credited`,
      awarded,
      skipped
    });
  } catch (error) {
    return fail(res, error, 'Failed to credit the organisers');
  }
};

// ---------------------------------------------------------------- badges

export const listAchievements = async (req, res) => {
  try {
    const isAdmin = req.user.effectiveRole === ROLES.ADMIN;
    const requested = req.query.userId;

    if (requested && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only an administrator can read another student badges'
      });
    }

    const userId = requested || req.user.id;

    const catalog = isAdmin
      ? await Achievement.find().sort({ sortOrder: 1, title: 1 }).lean()
      : await getActiveAchievements();

    const [metrics, earned] = await Promise.all([
      computeStudentMetrics(userId),
      StudentBadge.find({ user: oid(userId) })
        .select('slug earnedAt metricValue')
        .lean()
    ]);

    const earnedBySlug = new Map(
      earned.map((badge) => [badge.slug, badge])
    );

    return res.status(200).json({
      success: true,
      userId,
      metrics,
      achievements: catalog.map((badge) => {
        const record = earnedBySlug.get(badge.slug);
        const value = metrics[badge.metric] ?? 0;

        return {
          id: badge._id,
          slug: badge.slug,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
          metric: badge.metric,
          threshold: badge.threshold,
          xpBonus: badge.xpBonus,
          active: badge.active !== false,
          sortOrder: badge.sortOrder,
          value,
          remaining: Math.max(0, badge.threshold - value),
          progressPercent: Math.min(
            100,
            Math.round((value / badge.threshold) * 100)
          ),
          earned: Boolean(record),
          earnedAt: record?.earnedAt || null
        };
      })
    });
  } catch (error) {
    return fail(res, error, 'Failed to load achievements');
  }
};

export const createAchievement = async (req, res) => {
  try {
    const {
      slug,
      title,
      description,
      icon,
      metric,
      threshold,
      xpBonus,
      sortOrder
    } = req.body || {};

    if (!slug || !title || !description || !metric) {
      return badRequest(
        res,
        'slug, title, description and metric are required'
      );
    }

    if (!Object.values(ACHIEVEMENT_METRICS).includes(metric)) {
      return badRequest(res, 'Unknown metric');
    }

    const parsedThreshold = Number(threshold);

    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 1) {
      return badRequest(res, 'threshold must be a positive number');
    }

    const exists = await Achievement.exists({
      slug: String(slug).toLowerCase()
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'A badge with that slug already exists'
      });
    }

    const badge = await Achievement.create({
      slug: String(slug).toLowerCase(),
      title: String(title).trim(),
      description: String(description).trim(),
      icon: icon ? String(icon).trim() : 'Award',
      metric,
      threshold: parsedThreshold,
      xpBonus: Number(xpBonus) || 0,
      sortOrder: Number(sortOrder) || 100
    });

    return res.status(201).json({ success: true, achievement: badge });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A badge with that slug already exists'
      });
    }

    if (error?.name === 'ValidationError') {
      return badRequest(
        res,
        Object.values(error.errors)
          .map((field) => field.message)
          .join(', ')
      );
    }

    return fail(res, error, 'Failed to create the badge');
  }
};

// Editing a threshold does not retro-award the badge; the recompute endpoint
// applies the new rules to everyone.
export const updateAchievement = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'Invalid badge id');
    }

    const updates = {};

    for (const field of ['title', 'description', 'icon']) {
      if (req.body?.[field] !== undefined) {
        const value = String(req.body[field]).trim();

        if (!value) return badRequest(res, `${field} cannot be empty`);

        updates[field] = value;
      }
    }

    if (req.body?.metric !== undefined) {
      if (!Object.values(ACHIEVEMENT_METRICS).includes(req.body.metric)) {
        return badRequest(res, 'Unknown metric');
      }

      updates.metric = req.body.metric;
    }

    if (req.body?.threshold !== undefined) {
      const threshold = Number(req.body.threshold);

      if (!Number.isFinite(threshold) || threshold < 1) {
        return badRequest(res, 'threshold must be a positive number');
      }

      updates.threshold = threshold;
    }

    if (req.body?.xpBonus !== undefined) {
      const bonus = Number(req.body.xpBonus);

      if (!Number.isFinite(bonus) || bonus < 0 || bonus > 5000) {
        return badRequest(res, 'xpBonus must be between 0 and 5000');
      }

      updates.xpBonus = bonus;
    }

    if (req.body?.sortOrder !== undefined) {
      updates.sortOrder = Number(req.body.sortOrder) || 100;
    }

    if (req.body?.active !== undefined) {
      updates.active = Boolean(req.body.active);
    }

    if (!Object.keys(updates).length) {
      return badRequest(res, 'No editable badge fields were provided');
    }

    const badge = await Achievement.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    return res.status(200).json({ success: true, achievement: badge });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return badRequest(
        res,
        Object.values(error.errors)
          .map((field) => field.message)
          .join(', ')
      );
    }

    return fail(res, error, 'Failed to update the badge');
  }
};

// ---------------------------------------------------------------- admin

// Brings the ledger, the projection and the badge board into line with the
// attendance records that already exist. This is what makes a campus that
// predates gamification appear on the leaderboard without inventing data.
export const recompute = async (req, res) => {
  try {
    await ensureAchievementCatalog();

    const backfill = await backfillAttendanceXp({
      maxEvents: Math.min(Number(req.body?.maxEvents) || 200, 1000)
    });

    const userIds = await XPTransaction.distinct('user');

    // Each student costs a handful of indexed queries, so a campus-wide rebuild
    // is capped per call. The endpoint is idempotent: run it again for the rest.
    const maxStudents = Math.min(
      Number(req.body?.maxStudents) || 500,
      2000
    );

    const batch = userIds.slice(0, maxStudents);

    for (const userId of batch) {
      await rebuildProjection(userId);
      await evaluateAchievements(userId);
    }

    const [badgesTotal, drifted] = await Promise.all([
      StudentBadge.countDocuments({}),
      findProjectionDrift()
    ]);

    return res.status(200).json({
      success: true,
      message: `Recomputed gamification for ${batch.length} student(s)`,
      backfill,
      studentsWithLedger: userIds.length,
      studentsRebuilt: batch.length,
      remaining: Math.max(0, userIds.length - batch.length),
      badgesTotal,
      driftingProfiles: drifted.length
    });
  } catch (error) {
    return fail(res, error, 'Failed to recompute gamification data');
  }
};

// Compares the cached projection against the ledger for the highest-scoring
// students. Capped because a drift report is a triage tool, not a full audit;
// the recompute endpoint is the full audit and it always covers everyone.
const DRIFT_SCAN_CAP = 2000;

const findProjectionDrift = async () => {
  const totals = await XPTransaction.aggregate([
    { $group: { _id: '$user', totalXp: { $sum: '$amount' } } },
    { $sort: { totalXp: -1 } },
    { $limit: DRIFT_SCAN_CAP }
  ]);

  const byUser = new Map(
    totals.map((row) => [String(row._id), row.totalXp])
  );

  const projections = await Gamification.find({
    user: { $in: [...byUser.keys()].map(oid) }
  })
    .select('user totalXp')
    .lean();

  const drift = [];

  for (const row of projections) {
    const expected = byUser.get(String(row.user)) ?? 0;

    if ((row.totalXp || 0) !== expected) {
      drift.push({
        userId: row.user,
        cached: row.totalXp || 0,
        ledger: expected
      });
    }

    byUser.delete(String(row.user));
  }

  // A ledger with no profile at all is drift of a different kind: the award
  // path wrote the row but not the projection.
  for (const [userId, totalXp] of byUser) {
    drift.push({ userId, cached: null, ledger: totalXp });
  }

  return drift.slice(0, 50);
};

export const getAnalytics = async (req, res) => {
  try {
    const [summary, drift] = await Promise.all([
      gamificationAnalytics(),
      findProjectionDrift()
    ]);

    return res.status(200).json({
      success: true,
      ...summary,
      driftingProfiles: drift.slice(0, 20),
      driftingCount: drift.length
    });
  } catch (error) {
    return fail(res, error, 'Failed to load gamification analytics');
  }
};

// Every check below is a query over real records, not a heuristic score: each
// one names the rows that break an invariant the award path is supposed to
// guarantee, so an admin can act rather than argue.
export const getSuspiciousActivity = async (req, res) => {
  try {
    const findings = [];

    // 1. Automatic awards that do not match the published rate for their type.
    const mismatched = await XPTransaction.aggregate([
      { $match: { source: { $ne: 'admin' }, amount: { $gt: 0 } } },
      { $group: { _id: '$type', xp: { $sum: '$amount' }, rows: { $sum: 1 } } }
    ]);

    const unexpectedRates = mismatched.filter((row) => {
      const rule = XP_RULES[row._id];

      return rule !== undefined && row.xp / row.rows !== rule;
    });

    if (unexpectedRates.length) {
      findings.push({
        key: 'xp_rate_mismatch',
        severity: 'high',
        title: 'Automatic awards off the published rate',
        detail:
          'Attendance awards are written by the system at a fixed rate, so an ' +
          'average that differs from that rate means rows were written outside ' +
          'the normal path or the rules changed underneath them.',
        types: unexpectedRates.map((row) => ({
          type: row._id,
          averageXp: Math.round((row.xp / row.rows) * 100) / 100,
          expectedXp: XP_RULES[row._id],
          rows: row.rows
        }))
      });
    }

    // 2. Attendance rows that earned no points, i.e. a failed award.
    const unsettled = await findUnsettledAttendance(25);

    if (unsettled.length) {
      findings.push({
        key: 'unsettled_attendance',
        severity: 'high',
        title: 'Verified attendance with no XP award',
        detail:
          'Within the most recent 2,000 attendance records, ' +
          `${unsettled[0].totalUnsettled} have no matching XP entry. This is ` +
          'usually an award write that failed after the check-in committed. ' +
          'Run recompute to settle them.',
        examples: unsettled
      });
    }

    // 3. Two positive awards of the same base type for one student at one event.
    const doubled = await XPTransaction.aggregate([
      { $match: { type: { $in: ATTENDANCE_TYPES }, amount: { $gt: 0 } } },
      {
        $group: {
          _id: { user: '$user', event: '$event', type: '$type' },
          awards: { $sum: 1 },
          xp: { $sum: '$amount' }
        }
      },
      { $match: { awards: { $gt: 1 } } },
      { $sort: { awards: -1 } },
      { $limit: 25 },
      { $lookup: {
          from: 'users',
          localField: '_id.user',
          foreignField: '_id',
          as: 'student'
        } },
      { $unwind: '$student' },
      {
        $project: {
          _id: 0,
          userId: '$_id.user',
          eventId: '$_id.event',
          type: '$_id.type',
          awards: 1,
          xp: 1,
          name: '$student.name'
        }
      }
    ]);

    if (doubled.length) {
      findings.push({
        key: 'duplicate_awards',
        severity: 'high',
        title: 'Duplicate XP for a single activity',
        detail:
          'The idempotency key makes this impossible through the normal path, ' +
          'so these rows indicate data that was written or edited directly.',
        examples: doubled
      });
    }

    // 4. Check-ins that fall far outside the event window: someone marking a
    // roster days after the fact.
    const offWindow = await findOffWindowAttendance(25);

    if (offWindow.length) {
      findings.push({
        key: 'off_window_checkin',
        severity: 'medium',
        title: 'Attendance recorded outside the event window',
        detail:
          'Check-ins more than 48 hours before a start or 72 hours after an ' +
          'end are usually bulk roster entries rather than real attendance.',
        examples: offWindow
      });
    }

    // 5. One admin moving a lot of points in a short period.
    const dayAgo = new Date(Date.now() - 86400000);

    const bursts = await XPTransaction.aggregate([
      {
        $match: {
          source: 'admin',
          createdAt: { $gte: dayAgo },
          type: XP_TYPES.MANUAL_ADJUSTMENT
        }
      },
      {
        $group: {
          _id: '$awardedBy',
          awards: { $sum: 1 },
          xp: { $sum: '$amount' },
          students: { $addToSet: '$user' }
        }
      },
      { $match: { awards: { $gte: 25 } } },
      { $sort: { awards: -1 } },
      { $limit: 10 },
      { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'actor'
        } },
      { $unwind: '$actor' },
      {
        $project: {
          _id: 0,
          adminId: '$_id',
          name: '$actor.name',
          awards: 1,
          netXp: '$xp',
          studentsTouched: { $size: '$students' }
        }
      }
    ]);

    if (bursts.length) {
      findings.push({
        key: 'manual_award_burst',
        severity: 'medium',
        title: 'Heavy manual adjustment in the last 24 hours',
        detail:
          'Manual adjustments are meant to be occasional corrections. A large ' +
          'batch is usually legitimate (an end-of-term import) but is worth a ' +
          'second set of eyes.',
        examples: bursts
      });
    }

    // 6. Negative scores.
    const negative = await XPTransaction.aggregate([
      { $group: { _id: '$user', totalXp: { $sum: '$amount' } } },
      { $match: { totalXp: { $lt: 0 } } },
      { $sort: { totalXp: 1 } },
      { $limit: 20 }
    ]);

    if (negative.length) {
      findings.push({
        key: 'negative_total_xp',
        severity: 'low',
        title: 'Students with a negative lifetime score',
        detail:
          'Deductions exceeded what the student earned. They are hidden from ' +
          'the public board, but the reason should be reviewed.',
        examples: negative
      });
    }

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      checkedAt: new Date().toISOString(),
      findingCount: findings.length,
      findings
    });
  } catch (error) {
    return fail(res, error, 'Failed to scan for suspicious activity');
  }
};

const findUnsettledAttendance = async (limit) => {
  const rows = await Attendance.find()
    .sort({ checkedInAt: -1 })
    .limit(2000)
    .select('_id user event method checkedInAt')
    .lean();

  if (!rows.length) return [];

  const keys = new Set(
    (
      await XPTransaction.find({
        idempotencyKey: { $in: rows.map((row) => attendanceIdempotencyKey(row._id)) }
      })
        .select('idempotencyKey')
        .lean()
    ).map((row) => row.idempotencyKey)
  );

  const unpaid = rows.filter((row) => !keys.has(attendanceIdempotencyKey(row._id)));

  const examples = unpaid.slice(0, limit).map((row) => ({
    attendanceId: row._id,
    userId: row.user,
    eventId: row.event,
    method: row.method,
    checkedInAt: row.checkedInAt
  }));

  return examples.length
    ? attachNames(examples, unpaid.length)
    : [];
};

const attachNames = async (examples, total) => {
  const ids = [...new Set(examples.map((row) => String(row.userId)))];

  const users = await User.find({ _id: { $in: ids.map(oid) } })
    .select('name studentId')
    .lean();

  const byId = new Map(users.map((user) => [String(user._id), user]));

  return examples.map((row) => ({
    ...row,
    studentName: byId.get(String(row.userId))?.name || 'Unknown',
    totalUnsettled: total
  }));
};

const findOffWindowAttendance = async (limit) => {
  const rows = await Attendance.find()
    .sort({ checkedInAt: -1 })
    .limit(1000)
    .populate('event', 'title date endDate')
    .lean();

  const offenders = rows
    .filter((row) => row.event?.date && row.event?.endDate)
    .map((row) => {
      const start = new Date(row.event.date).getTime();
      const end = new Date(row.event.endDate).getTime();
      const at = new Date(row.checkedInAt).getTime();

      const early = start - at;
      const late = at - end;

      if (early > 48 * 3600000) {
        return { row, issue: 'before_start', hours: Math.round(early / 3600000) };
      }

      if (late > 72 * 3600000) {
        return { row, issue: 'after_end', hours: Math.round(late / 3600000) };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, limit);

  return offenders.map((offender) => ({
    attendanceId: offender.row._id,
    userId: offender.row.user,
    eventId: offender.row.event._id,
    eventTitle: offender.row.event.title,
    method: offender.row.method,
    issue: offender.issue,
    hoursOff: offender.hours
  }));
};

// A report the admin can open in a spreadsheet. Values that could be read as a
// formula by Excel are prefixed, because a leaderboard export is exactly the
// kind of file someone pastes into a shared workbook.
const csvCell = (value) => {
  if (value === null || value === undefined) return '';

  const text = String(value);

  // Prefixing with an apostrophe makes Excel treat the cell as text. It has to
  // go inside the quotes, and any quote in the value still needs doubling.
  if (/^[=+\-@\t\r]/.test(text)) return `"'${text.replace(/"/g, '""')}"`;

  return `"${text.replace(/"/g, '""')}"`;
};

export const exportLeaderboard = async (req, res) => {
  try {
    const scope = req.query.scope === 'clubs' ? 'clubs' : 'students';
    const period = cleanPeriod(req.query.period);

    const rows = await leaderboardRows({
      scope,
      period,
      semesterKey: req.query.semester || null
    });

    const header =
      scope === 'clubs'
        ? [
            'rank',
            'club',
            'department',
            'total_xp',
            'events_organized',
            'members',
            'participants'
          ]
        : [
            'rank',
            'name',
            'student_id',
            'department',
            'total_xp',
            'events_attended',
            'competitions_won'
          ];

    const lines = [header.join(',')];

    for (const row of rows) {
      const values =
        scope === 'clubs'
          ? [
              row.rank,
              row.name,
              row.department,
              row.totalXp,
              row.eventsOrganized,
              row.members,
              row.participation
            ]
          : [
              row.rank,
              row.name,
              row.studentId,
              row.department,
              row.totalXp,
              row.eventsAttended,
              row.competitionsWon
            ];

      lines.push(values.map(csvCell).join(','));
    }

    const filename = `${scope}-leaderboard-${period}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(lines.join('\r\n'));
  } catch (error) {
    return fail(res, error, 'Failed to export the leaderboard');
  }
};

// The ranking table in the admin panel needs XP per student without paging
// through the public board, and this is the endpoint that reads the projection
// rather than re-scanning the ledger.
export const getStudentXpTable = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const rows = await Gamification.find()
      .sort({ totalXp: -1 })
      .limit(limit)
      .populate('user', 'name department studentId role')
      .lean();

    return res.status(200).json({
      success: true,
      entries: rows
        .filter((row) => row.user)
        .map((row) => ({
          userId: row.user._id,
          name: row.user.name,
          department: row.user.department || null,
          studentId: row.user.studentId || null,
          role: row.user.role,
          totalXp: row.totalXp,
          updatedAt: row.updatedAt,
          xpByType: row.xpByType || {}
        }))
    });
  } catch (error) {
    return fail(res, error, 'Failed to load XP totals');
  }
};
