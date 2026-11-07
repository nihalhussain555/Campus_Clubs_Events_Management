// Single source of truth for the gamification economy. Values are read at
// award time and stamped onto the transaction, so changing a number here never
// rewrites history that students already earned.

export const XP_TYPES = {
  EVENT_ATTENDANCE: 'event_attendance',
  COMPETITION_PARTICIPATION: 'competition_participation',
  COMPETITION_WIN: 'competition_win',
  VOLUNTEERING: 'volunteering',
  EVENT_ORGANIZING: 'event_organizing',
  WORKSHOP_COMPLETION: 'workshop_completion',
  ACHIEVEMENT_BONUS: 'achievement_bonus',
  MANUAL_ADJUSTMENT: 'manual_adjustment'
};

// Default points configuration.
export const XP_RULES = {
  [XP_TYPES.EVENT_ATTENDANCE]: 10,
  [XP_TYPES.COMPETITION_PARTICIPATION]: 20,
  [XP_TYPES.COMPETITION_WIN]: 50,
  [XP_TYPES.VOLUNTEERING]: 20,
  [XP_TYPES.EVENT_ORGANIZING]: 30,
  [XP_TYPES.WORKSHOP_COMPLETION]: 15
};

export const ACTIVITY_TYPES = {
  EVENT: 'event',
  COMPETITION: 'competition',
  WORKSHOP: 'workshop',
  VOLUNTEERING: 'volunteering'
};

// What a verified attendance row is worth, per activity type. One attendance
// record produces exactly one base award, so a competition entrant earns 20 and
// not 20 + 10 for the same seat.
const ACTIVITY_AWARD_TYPE = {
  [ACTIVITY_TYPES.EVENT]: XP_TYPES.EVENT_ATTENDANCE,
  [ACTIVITY_TYPES.COMPETITION]: XP_TYPES.COMPETITION_PARTICIPATION,
  [ACTIVITY_TYPES.WORKSHOP]: XP_TYPES.WORKSHOP_COMPLETION,
  [ACTIVITY_TYPES.VOLUNTEERING]: XP_TYPES.VOLUNTEERING
};

export const awardTypeForActivity = (activityType) =>
  ACTIVITY_AWARD_TYPE[activityType] || XP_TYPES.EVENT_ATTENDANCE;

export const isActivityType = (value) =>
  Object.values(ACTIVITY_TYPES).includes(value);

// Transaction types that count as "attended an event".
export const ATTENDANCE_TYPES = Object.values(ACTIVITY_AWARD_TYPE);

// Types that may be awarded by a human rather than derived from an attendance
// row. Manual awards always carry a reason and an actor.
export const MANUAL_AWARD_TYPES = [
  XP_TYPES.COMPETITION_WIN,
  XP_TYPES.VOLUNTEERING,
  XP_TYPES.EVENT_ORGANIZING,
  XP_TYPES.WORKSHOP_COMPLETION,
  XP_TYPES.EVENT_ATTENDANCE,
  XP_TYPES.COMPETITION_PARTICIPATION,
  XP_TYPES.MANUAL_ADJUSTMENT
];

export const TRANSACTION_TYPES = [...MANUAL_AWARD_TYPES, XP_TYPES.ACHIEVEMENT_BONUS];

// Club standings score the work done through that club's events. Personal badge
// bonuses are excluded, otherwise one high-achieving student inflates every
// club they have ever joined.
export const CLUB_SCORED_TYPES = TRANSACTION_TYPES.filter(
  (type) => type !== XP_TYPES.ACHIEVEMENT_BONUS
);

export const periods = ['overall', 'weekly', 'monthly', 'semester'];

// Levels are a pure function of lifetime XP so nothing can drift: level 2 always
// costs the same whether it was reached in 2024 or today.
const LEVEL_STEP = 100;
const LEVEL_GROWTH = 25;
const MAX_LEVEL = 60;

const levelThresholds = (() => {
  const thresholds = [0];
  let cost = LEVEL_STEP;

  for (let level = 1; level < MAX_LEVEL; level += 1) {
    thresholds.push(thresholds[level - 1] + cost);
    cost += LEVEL_GROWTH;
  }

  return thresholds;
})();

const LEVEL_TITLES = [
  'Freshface',
  'Participant',
  'Contributor',
  'Regular',
  'Active Member',
  'Achiever',
  'Rising Star',
  'Club Regular',
  'Champion',
  'Mentor',
  'Campus Legend'
];

export const levelForXp = (xp) => {
  const total = Number(xp) || 0;

  for (let index = levelThresholds.length - 1; index >= 0; index -= 1) {
    if (total >= levelThresholds[index]) {
      return index + 1;
    }
  }

  return 1;
};

export const levelBreakdown = (xp) => {
  const total = Number(xp) || 0;
  const level = levelForXp(total);
  const floor = levelThresholds[level - 1];
  const ceiling = levelThresholds[level] ?? null;
  const maxLevel = level === levelThresholds.length;

  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    currentXp: total,
    levelFloorXp: floor,
    nextLevelXp: ceiling,
    xpIntoLevel: total - floor,
    xpForNextLevel: maxLevel ? 0 : ceiling - floor,
    progressPercent: maxLevel
      ? 100
      : Math.min(
          100,
          Math.round(((total - floor) / (ceiling - floor)) * 100)
        ),
    maxLevel
  };
};

export const xpRulesView = () =>
  Object.entries(XP_RULES).map(([type, points]) => ({ type, points }));

// ---------------------------------------------------------------- time windows

const startOfUtcDay = (date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

// The calendar week containing the date, starting Monday. Simpler and more
// predictable for a campus ranking than ISO week-year arithmetic, which shifts
// the first few days of January into the previous year.
export const rankingWeekStart = (now = new Date()) => {
  const date = new Date(now);
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const midnight = startOfUtcDay(date);

  return new Date(midnight - (weekday - 1) * 86400000);
};

export const startOfMonth = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

// Academic terms, keyed by the calendar month they begin in. A campus that runs
// a different calendar can override these without touching query code.
const SEMESTER_DEFINITIONS = [
  { key: 'spring', name: 'Spring', startMonth: 1, endMonth: 5 },
  { key: 'summer', name: 'Summer', startMonth: 6, endMonth: 8 },
  { key: 'fall', name: 'Fall', startMonth: 9, endMonth: 12 }
];

const semesterKeyFor = (month) =>
  SEMESTER_DEFINITIONS.find(
    (term) => month >= term.startMonth && month <= term.endMonth
  ) || SEMESTER_DEFINITIONS[2];

export const semesterWindowFor = (now = new Date()) => {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const term = semesterKeyFor(month);

  const start = new Date(Date.UTC(year, term.startMonth - 1, 1));
  const end = new Date(Date.UTC(year, term.endMonth, 1));

  return {
    key: `${term.key}-${year}`,
    label: `${term.name} ${year}`,
    start,
    end
  };
};

export const semesterWindows = (lookbackYears = 3, now = new Date()) => {
  const windows = [];
  const currentYear = new Date(now).getUTCFullYear();

  for (let year = currentYear - lookbackYears + 1; year <= currentYear; year += 1) {
    for (const term of SEMESTER_DEFINITIONS) {
      const start = new Date(Date.UTC(year, term.startMonth - 1, 1));
      const end = new Date(Date.UTC(year, term.endMonth, 1));

      windows.push({
        key: `${term.key}-${year}`,
        label: `${term.name} ${year}`,
        start: start.toISOString(),
        end: end.toISOString()
      });
    }
  }

  return windows;
};

export const periodWindow = (period, now = new Date(), semesterKey = null) => {
  switch (period) {
    case 'weekly': {
      const start = rankingWeekStart(now);

      return { period: 'weekly', start, end: null, label: 'This week' };
    }
    case 'monthly': {
      const start = startOfMonth(now);

      return { period: 'monthly', start, end: null, label: 'This month' };
    }
    case 'semester': {
      const current = semesterWindowFor(now);
      const chosen = semesterKey
        ? semesterWindows(6, now).find((term) => term.key === semesterKey)
        : current;

      if (!chosen) {
        return {
          period: 'semester',
          start: current.start,
          end: current.end,
          label: current.label,
          key: current.key
        };
      }

      return {
        period: 'semester',
        start: new Date(chosen.start),
        end: new Date(chosen.end),
        label: chosen.label,
        key: chosen.key
      };
    }
    default:
      return { period: 'overall', start: null, end: null, label: 'All time' };
  }
};

// ---------------------------------------------------------------- achievements

export const ACHIEVEMENT_METRICS = {
  EVENTS_ATTENDED: 'eventsAttended',
  ACTIVE_WEEKS: 'activeWeeks',
  COMPETITION_ENTRIES: 'competitionEntries',
  COMPETITION_WINS: 'competitionWins',
  VOLUNTEER_CREDITS: 'volunteerCredits',
  EVENTS_ORGANIZED: 'eventsOrganized',
  CLUBS_LED: 'clubsLed',
  TOTAL_XP: 'totalXp',
  BADGES_EARNED: 'badgesEarned'
};

// Seeded into the Achievement collection on boot and editable by admins
// afterwards. Insert-only by slug, so admin edits are never overwritten by a
// deploy.
export const ACHIEVEMENT_CATALOG = [
  {
    slug: 'first_event',
    title: 'First Event',
    description: 'Checked in to your very first campus event.',
    icon: 'Sparkles',
    metric: ACHIEVEMENT_METRICS.EVENTS_ATTENDED,
    threshold: 1,
    xpBonus: 25,
    sortOrder: 10
  },
  {
    slug: 'event_explorer',
    title: 'Event Explorer',
    description: 'Attended five or more verified campus events.',
    icon: 'Compass',
    metric: ACHIEVEMENT_METRICS.EVENTS_ATTENDED,
    threshold: 5,
    xpBonus: 60,
    sortOrder: 20
  },
  {
    slug: 'consistent_participant',
    title: 'Consistent Participant',
    description: 'Showed up and earned XP in four separate weeks.',
    icon: 'CalendarCheck',
    metric: ACHIEVEMENT_METRICS.ACTIVE_WEEKS,
    threshold: 4,
    xpBonus: 75,
    sortOrder: 30
  },
  {
    slug: 'super_volunteer',
    title: 'Super Volunteer',
    description: 'Credited with volunteering at three campus activities.',
    icon: 'HeartHandshake',
    metric: ACHIEVEMENT_METRICS.VOLUNTEER_CREDITS,
    threshold: 3,
    xpBonus: 90,
    sortOrder: 40
  },
  {
    slug: 'event_organizer',
    title: 'Event Organizer',
    description: 'Ran three events from start to finish.',
    icon: 'ClipboardList',
    metric: ACHIEVEMENT_METRICS.EVENTS_ORGANIZED,
    threshold: 3,
    xpBonus: 120,
    sortOrder: 50
  },
  {
    slug: 'competition_champion',
    title: 'Competition Champion',
    description: 'Won a judged campus competition.',
    icon: 'Trophy',
    metric: ACHIEVEMENT_METRICS.COMPETITION_WINS,
    threshold: 1,
    xpBonus: 100,
    sortOrder: 60
  },
  {
    slug: 'club_leader',
    title: 'Club Leader',
    description: 'Took responsibility for running a club.',
    icon: 'Users',
    metric: ACHIEVEMENT_METRICS.CLUBS_LED,
    threshold: 1,
    xpBonus: 80,
    sortOrder: 70
  },
  {
    slug: 'campus_legend',
    title: 'Campus Legend',
    description: 'Reached 500 lifetime XP across all activity types.',
    icon: 'Crown',
    metric: ACHIEVEMENT_METRICS.TOTAL_XP,
    threshold: 500,
    xpBonus: 250,
    sortOrder: 80
  }
];

export const MAX_AWARD_AMOUNT = 1000;
export const MAX_REASON_LENGTH = 400;
export const LEADERBOARD_MAX_LIMIT = 50;
export const LEADERBOARD_DEFAULT_LIMIT = 20;

// Ranking is materialised server-side up to this many rows so competition-style
// ranks (ties share a place) stay exact. Beyond it the list falls back to
// positional ranks, which is still correct for a page but not for ties.
export const RANK_SCAN_CAP = 2000;
