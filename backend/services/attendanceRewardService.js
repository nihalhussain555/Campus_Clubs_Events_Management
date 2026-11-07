import Attendance from '../models/Attendance.js';
import Event from '../models/Event.js';

import { awardForAttendance } from './xpService.js';

// Awards the base attendance XP for an event.
//
// This lives apart from the check-in path because that path has already
// committed its Attendance row by the time gamification runs: if the award
// write fails there, retrying the scan is refused by the duplicate guard, so
// the points would be lost for good. Settling from the attendance records
// themselves is idempotent and always safe to re-run.
//
// Returns null when the event cannot be settled, and a count of rows that were
// actually paid otherwise.
export const settleAttendanceXp = async (eventId, { limit = 500 } = {}) => {
  const event = await Event.findById(eventId).select(
    'title activityType club status'
  );

  if (!event || event.status === 'cancelled') return null;

  const rows = await Attendance.find({ event: event._id })
    .select('_id user')
    .limit(limit)
    .lean();

  let awarded = 0;
  let alreadySettled = 0;

  // The ledger's unique idempotency key decides what is already paid, so this
  // never has to guess from a copy of the key format.
  for (const row of rows) {
    const { duplicated } = await awardForAttendance({
      event: event.toObject(),
      userId: row.user,
      attendance: row
    });

    if (duplicated) {
      alreadySettled += 1;
      continue;
    }

    awarded += 1;
  }

  return { awarded, alreadySettled };
};

// The same reconciliation, walked across every event. Used by the admin
// recompute endpoint to pull a campus that predates gamification into the
// leaderboard without inventing any numbers.
export const backfillAttendanceXp = async ({ maxEvents = 200 } = {}) => {
  const events = await Event.find({ status: { $ne: 'cancelled' } })
    .select('_id')
    .sort({ date: -1 })
    .limit(maxEvents)
    .lean();

  let awarded = 0;
  let alreadySettled = 0;
  let skipped = 0;

  for (const event of events) {
    const result = await settleAttendanceXp(event._id);

    if (!result) {
      skipped += 1;
      continue;
    }

    awarded += result.awarded;
    alreadySettled += result.alreadySettled;
  }

  return { eventsScanned: events.length, awarded, alreadySettled, skipped };
};
