import User from '../models/User.js';
import Club from '../models/Club.js';
import Event from '../models/Event.js';
import Certificate from '../models/Certificate.js';
import Attendance from '../models/Attendance.js';

// The Groq model has no database access, so every factual answer has to come
// from this snapshot. Lists are capped to keep the prompt inside the context
// budget on a real campus.
const CLUB_LIMIT = 30;
const EVENT_LIMIT = 40;
const USER_EVENT_LIMIT = 12;

const clip = (value, max = 90) => {
  if (!value) return null;

  const text = String(value).replace(/\s+/g, ' ').trim();

  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const stamp = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString().slice(0, 16).replace('T', ' ');
};

const clubNameOf = (club) => club?.clubName || 'Unassigned';

const statusOf = (event, now) => {
  if (event.status === 'cancelled') return 'cancelled';
  if (now < new Date(event.date)) return 'upcoming';
  if (now <= new Date(event.endDate)) return 'ongoing';
  return 'completed';
};

const briefClub = (club) => ({
  name: club.clubName,
  category: club.category || 'General',
  members: (club.members || []).length,
  leader: club.admin?.name || 'Not assigned'
});

const briefEvent = (event, now) => ({
  title: event.title,
  club: clubNameOf(event.club),
  start: stamp(event.date),
  end: stamp(event.endDate),
  location: event.location || 'TBD',
  category: event.category || 'General',
  status: statusOf(event, now),
  registered: (event.registeredStudents || []).length,
  attended: (event.participants || []).length,
  capacity: Number.isFinite(event.capacity) ? event.capacity : null,
  certificate: event.certificateEnabled !== false
});

const owns = (list, userId) =>
  (list || []).some((entry) => String(entry?._id || entry) === String(userId));

// Answers about "what's on this week" matter far more than history, so the
// prompt window leads with live and upcoming events.
const STATUS_PRIORITY = { ongoing: 0, upcoming: 1, cancelled: 2, completed: 3 };

const byRelevance = (a, b) => {
  const pa = STATUS_PRIORITY[a.liveStatus] ?? 4;
  const pb = STATUS_PRIORITY[b.liveStatus] ?? 4;

  if (pa !== pb) return pa - pb;

  const da = new Date(a.date).getTime();
  const db = new Date(b.date).getTime();

  return pa >= 2 ? db - da : da - db;
};

export const buildCampusContext = async (user) => {
  const now = new Date();

  const [clubs, recentEvents] = await Promise.all([
    Club.find()
      .select('clubName category members admin')
      .populate('admin', 'name')
      .sort({ clubName: 1 })
      .lean(),
    Event.find()
      .select(
        'title date endDate location category capacity status registeredStudents participants certificateEnabled club'
      )
      .populate('club', 'clubName')
      // Newest first so a campus with years of history still keeps its live
      // events inside the fetch window.
      .sort({ date: -1 })
      .limit(500)
      .lean()
  ]);

  const withStatus = recentEvents
    .map((event) => ({ ...event, liveStatus: statusOf(event, now) }))
    .sort(byRelevance);

  const context = {
    generatedAt: stamp(now),
    totals: {
      clubs: clubs.length,
      events: withStatus.length,
      upcoming: withStatus.filter((e) => e.liveStatus === 'upcoming').length,
      ongoing: withStatus.filter((e) => e.liveStatus === 'ongoing').length,
      completed: withStatus.filter((e) => e.liveStatus === 'completed').length,
      cancelled: withStatus.filter((e) => e.liveStatus === 'cancelled').length,
      memberships: clubs.reduce((t, c) => t + (c.members || []).length, 0)
    },
    clubs: clubs.slice(0, CLUB_LIMIT).map(briefClub),
    events: withStatus.slice(0, EVENT_LIMIT).map((event) => briefEvent(event, now))
  };

  if (!user) return context;

  const userId = user.id || user._id;

  context.you = {
    name: user.name || 'You',
    role: user.effectiveRole || user.role || 'student',
    department: user.department || null,
    courses: []
  };

  const memberOf = clubs
    .filter((club) => owns(club.members, userId))
    .map((club) => ({
      name: club.clubName,
      category: club.category || 'General',
      youLead: String(club.admin?._id || club.admin) === String(userId)
    }));

  context.you.clubs = memberOf;

  const registeredFor = withStatus.filter((event) =>
    owns(event.registeredStudents, userId)
  );

  context.you.registrations = registeredFor
    .slice(0, USER_EVENT_LIMIT)
    .map((event) => ({
      title: event.title,
      club: clubNameOf(event.club),
      start: stamp(event.date),
      status: event.liveStatus,
      checkedIn: owns(event.participants, userId)
    }));

  context.you.eventsHosted = memberOf
    .filter((club) => club.youLead)
    .map((club) => club.name);

  const [certificateRows, attendanceCount] = await Promise.all([
    Certificate.find({ user: userId })
      .select('certificateId issuedAt event')
      .populate('event', 'title date')
      .sort({ issuedAt: -1 })
      .limit(USER_EVENT_LIMIT)
      .lean(),
    Attendance.countDocuments({ user: userId })
  ]);

  context.you.certificates = certificateRows.map((row) => ({
    event: row.event?.title || 'Unknown event',
    reference: clip(row.certificateId, 40),
    issued: stamp(row.issuedAt)
  }));

  context.you.attendanceCount = attendanceCount;

  if (context.you.role === 'admin') {
    const roleRows = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // club_member is the legacy spelling of student, so both land in one
    // bucket instead of confusing the model with two names for one audience.
    const labels = {
      student: 'students',
      club_member: 'students',
      club_leader: 'club leaders',
      admin: 'admins'
    };

    const byRole = {};

    for (const row of roleRows) {
      const label = labels[row._id] || String(row._id || 'students');
      byRole[label] = (byRole[label] || 0) + row.count;
    }

    context.admin = {
      accounts: {
        total: Object.values(byRole).reduce((t, n) => t + n, 0),
        byRole
      },
      busiestClubs: [...clubs]
        .sort((a, b) => (b.members || []).length - (a.members || []).length)
        .slice(0, 5)
        .map((club) => ({
          name: club.clubName,
          members: (club.members || []).length
        })),
      largestEvents: [...withStatus]
        .sort(
          (a, b) =>
            (b.registeredStudents || []).length -
            (a.registeredStudents || []).length
        )
        .slice(0, 5)
        .map((event) => ({
          title: event.title,
          registered: (event.registeredStudents || []).length,
          capacity: event.capacity ?? null
        })),
      notes: 'Totals cover the most recent ' + withStatus.length + ' events.'
    };
  }

  return context;
};

export default buildCampusContext;
