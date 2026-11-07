import mongoose from 'mongoose';
import crypto from 'node:crypto';

import XPTransaction from '../models/XPTransaction.js';
import Gamification from '../models/Gamification.js';
import Achievement from '../models/Achievement.js';
import StudentBadge from '../models/StudentBadge.js';
import Attendance from '../models/Attendance.js';
import Club from '../models/Club.js';
import Notification from '../models/Notification.js';

import {
  XP_TYPES,
  XP_RULES,
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_METRICS,
  MAX_AWARD_AMOUNT,
  rankingWeekStart,
  awardTypeForActivity
} from '../config/xpRules.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

class AwardError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.statusCode = status;
  }
}

// ---------------------------------------------------------------- catalog

// Insert-only by slug. A deploy that adds a ninth badge lands it without
// reverting an admin's edit to the threshold of an existing one.
export const ensureAchievementCatalog = async () => {
  const writes = ACHIEVEMENT_CATALOG.map((badge) => ({
    updateOne: {
      filter: { slug: badge.slug },
      update: { $setOnInsert: { ...badge } },
      upsert: true
    }
  }));

  if (!writes.length) return [];

  await Achievement.bulkWrite(writes);

  return Achievement.find().sort({ sortOrder: 1, title: 1 }).lean();
};

export const getActiveAchievements = async () => {
  const found = await Achievement.find({ active: true })
    .sort({ sortOrder: 1, title: 1 })
    .lean();

  if (found.length) return found;

  await ensureAchievementCatalog();

  return Achievement.find({ active: true })
    .sort({ sortOrder: 1, title: 1 })
    .lean();
};

// ---------------------------------------------------------------- awarding

// Every automatic award flows through here. The unique idempotencyKey is the
// duplicate guard: two racing check-ins for the same attendance row collide on
// the index and only the winner is paid.
export const awardXp = async ({
  user,
  type,
  amount,
  reason,
  event = null,
  club = null,
  idempotencyKey,
  awardedBy = null,
  source = 'automatic',
  achievement = null
}) => {
  if (!user || !type) {
    throw new AwardError('A student and an award type are required');
  }

  const points =
    amount === undefined || amount === null
      ? XP_RULES[type]
      : Number(amount);

  if (!Number.isFinite(points) || points === 0) {
    throw new AwardError('A non-zero point value is required');
  }

  if (Math.abs(points) > MAX_AWARD_AMOUNT) {
    throw new AwardError(
      `An award cannot exceed ${MAX_AWARD_AMOUNT} XP in either direction`
    );
  }

  const key = String(idempotencyKey || `manual:${crypto.randomUUID()}`);

  let transaction;

  try {
    transaction = await XPTransaction.create({
      user: oid(user),
      club: club ? oid(club) : null,
      event: event ? oid(event) : null,
      type,
      amount: Math.round(points),
      reason: reason ? String(reason).slice(0, 400) : undefined,
      awardedBy: awardedBy ? oid(awardedBy) : null,
      source,
      achievement,
      idempotencyKey: key
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await XPTransaction.findOne({ idempotencyKey: key })
        .select('amount type reason createdAt')
        .lean();

      return { duplicated: true, transaction: null, existing };
    }

    throw error;
  }

  await Gamification.updateOne(
    { user: oid(user) },
    {
      $inc: {
        totalXp: transaction.amount,
        [`xpByType.${type}`]: transaction.amount,
        [`countsByType.${type}`]: 1
      }
    },
    { upsert: true }
  );

  return { duplicated: false, transaction };
};

// Undo an award by writing its negative twin. History stays append-only: an
// auditor can see the original row, the reversal and who ordered it.
export const reverseXp = async (transactionId, { awardedBy, reason }) => {
  const original = await XPTransaction.findById(transactionId).lean();

  if (!original) {
    throw new AwardError('That XP entry no longer exists', 404);
  }

  if (original.reversedBy) {
    throw new AwardError('That XP entry has already been reversed', 409);
  }

  const { duplicated, transaction } = await awardXp({
    user: original.user,
    type: original.type,
    amount: -original.amount,
    reason: reason || `Reversal of ${original.type} award`,
    event: original.event,
    club: original.club,
    awardedBy,
    source: 'admin',
    idempotencyKey: `reverse:${original.idempotencyKey}`
  });

  if (duplicated) {
    throw new AwardError('That XP entry has already been reversed', 409);
  }

  await XPTransaction.updateOne(
    { _id: original._id },
    { $set: { reversedBy: transaction._id } }
  );

  return { original, transaction };
};

// ---------------------------------------------------------------- metrics

// Read from the authoritative records rather than the projection, so a badge
// can never be unlocked by a stale counter.
export const computeStudentMetrics = async (userId) => {
  const uid = oid(userId);

  const [
    eventsAttended,
    competitionEntries,
    competitionWins,
    volunteerCredits,
    eventsOrganized,
    clubsLed,
    badgesEarned,
    xpRows
  ] = await Promise.all([
    Attendance.countDocuments({ user: uid }),
    XPTransaction.countDocuments({
      user: uid,
      type: XP_TYPES.COMPETITION_PARTICIPATION,
      amount: { $gt: 0 }
    }),
    XPTransaction.countDocuments({
      user: uid,
      type: XP_TYPES.COMPETITION_WIN,
      amount: { $gt: 0 }
    }),
    XPTransaction.countDocuments({
      user: uid,
      type: XP_TYPES.VOLUNTEERING,
      amount: { $gt: 0 }
    }),
    XPTransaction.countDocuments({
      user: uid,
      type: XP_TYPES.EVENT_ORGANIZING,
      amount: { $gt: 0 }
    }),
    Club.countDocuments({ admin: uid }),
    StudentBadge.countDocuments({ user: uid }),
    XPTransaction.find({ user: uid }).select('createdAt type amount').lean()
  ]);

  // Every row counts toward the score, including deductions and reversals;
  // only positive rows count as a week of activity, so a reversed award cannot
  // keep a weekly streak alive.
  const totalXp = xpRows.reduce((sum, row) => sum + row.amount, 0);

  const activeWeeks = new Set(
    xpRows
      .filter((row) => row.amount > 0)
      .map((row) => rankingWeekStart(row.createdAt).getTime())
  ).size;

  return {
    [ACHIEVEMENT_METRICS.EVENTS_ATTENDED]: eventsAttended,
    [ACHIEVEMENT_METRICS.ACTIVE_WEEKS]: activeWeeks,
    [ACHIEVEMENT_METRICS.COMPETITION_ENTRIES]: competitionEntries,
    [ACHIEVEMENT_METRICS.COMPETITION_WINS]: competitionWins,
    [ACHIEVEMENT_METRICS.VOLUNTEER_CREDITS]: volunteerCredits,
    [ACHIEVEMENT_METRICS.EVENTS_ORGANIZED]: eventsOrganized,
    [ACHIEVEMENT_METRICS.CLUBS_LED]: clubsLed,
    [ACHIEVEMENT_METRICS.TOTAL_XP]: totalXp,
    [ACHIEVEMENT_METRICS.BADGES_EARNED]: badgesEarned
  };
};

// Badges are collectibles: once earned they stay on the profile even if a later
// deduction drops the metric back under the threshold.
export const evaluateAchievements = async (userId, { notify = true } = {}) => {
  const catalog = await getActiveAchievements();

  if (!catalog.length) return { earned: [], metrics: {} };

  const metrics = await computeStudentMetrics(userId);
  const earnedSlugs = new Set(
    (
      await StudentBadge.find({ user: oid(userId) })
        .select('slug')
        .lean()
    ).map((badge) => badge.slug)
  );

  const newlyEarned = [];

  for (const badge of catalog) {
    if (earnedSlugs.has(badge.slug)) continue;
    if (metrics[badge.metric] === undefined) continue;
    if (metrics[badge.metric] < badge.threshold) continue;

    try {
      await StudentBadge.create({
        user: oid(userId),
        achievement: badge._id,
        slug: badge.slug,
        metricValue: metrics[badge.metric]
      });
    } catch (error) {
      if (error?.code === 11000) continue;
      throw error;
    }

    newlyEarned.push(badge);

    if (badge.xpBonus > 0) {
      await awardXp({
        user: userId,
        type: XP_TYPES.ACHIEVEMENT_BONUS,
        amount: badge.xpBonus,
        reason: `${badge.title} badge bonus`,
        achievement: badge.slug,
        idempotencyKey: `badge:${userId}:${badge.slug}`
      });
    }

    if (notify) {
      await Notification.create({
        user: oid(userId),
        title: `${badge.title} unlocked`,
        message:
          `You earned the ${badge.title} badge` +
          (badge.xpBonus > 0 ? ` and ${badge.xpBonus} bonus XP.` : '.'),
        type: 'achievement'
      });
    }
  }

  // A badge bonus can itself cross the XP threshold of another badge, so the
  // pass repeats until nothing new unlocks. Each badge only pays once, so the
  // loop is bounded by the catalog size.
  if (newlyEarned.length) {
    const followUp = await evaluateAchievements(userId, { notify });

    return {
      earned: [...newlyEarned, ...followUp.earned],
      metrics: followUp.metrics
    };
  }

  return { earned: [], metrics };
};

// ---------------------------------------------------------------- projection

// Rebuild the per-user cache straight from the ledger. Used by the admin
// recompute endpoint and by the consistency check in the test suite.
export const rebuildProjection = async (userId) => {
  const uid = oid(userId);

  const grouped = await XPTransaction.aggregate([
    { $match: { user: uid } },
    {
      $group: {
        _id: '$type',
        xp: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const xpByType = {};
  const countsByType = {};

  for (const row of grouped) {
    xpByType[row._id] = row.xp;
    countsByType[row._id] = row.count;
  }

  const totalXp = Object.values(xpByType).reduce((sum, value) => sum + value, 0);

  await Gamification.updateOne(
    { user: uid },
    {
      $set: {
        totalXp,
        xpByType,
        countsByType
      }
    },
    { upsert: true }
  );

  return { totalXp, xpByType, countsByType };
};

export const getProjection = async (userId) => {
  const found = await Gamification.findOne({ user: oid(userId) }).lean();

  if (found) return found;

  return { user: null, totalXp: 0, xpByType: {}, countsByType: {} };
};

// The rows this service writes for a verified attendance record are keyed to
// the Attendance _id, which is what makes the award replay-proof. Exported so
// the admin anomaly checks can look the same rows up instead of re-deriving
// the format.
export const attendanceIdempotencyKey = (attendanceId) =>
  `attendance:${attendanceId}`;

// A verified check-in is the trigger for the base award. Keying the award to
// the Attendance _id means a genuine replay is impossible, while a check-in
// that is removed and later re-recorded is a different row and is paid again.
export const awardForAttendance = async ({ event, userId, attendance }) => {
  const type = awardTypeForActivity(event?.activityType);

  const { duplicated, transaction } = await awardXp({
    user: userId,
    type,
    reason: `Verified attendance - ${event?.title || 'event'}`,
    event: event?._id,
    club: event?.club?._id || event?.club || null,
    idempotencyKey: attendanceIdempotencyKey(attendance._id)
  });

  if (duplicated) return { duplicated: true, transaction: null };

  // Badge evaluation is best effort. The points are already banked, and a
  // failure here must not look like a failed check-in; the admin recompute
  // endpoint re-runs every evaluation anyway.
  try {
    await evaluateAchievements(userId);
  } catch (error) {
    console.error('Achievement evaluation failed:', error.message);
  }

  return { duplicated: false, transaction };
};

// Attendance was revoked, so the points that came with it go back. The badge
// the student already collected is kept; only the score is corrected.
export const reverseForAttendance = async ({
  attendance,
  userId,
  awardedBy,
  reason
}) => {
  const original = await XPTransaction.findOne({
    idempotencyKey: attendanceIdempotencyKey(attendance._id)
  }).lean();

  if (!original || original.reversedBy) return null;

  const { transaction } = await reverseXp(original._id, {
    awardedBy,
    reason: reason || 'Attendance revoked'
  });

  return transaction;
};

