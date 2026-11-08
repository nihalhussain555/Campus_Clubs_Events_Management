import Club from '../models/Club.js';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { EVENT_REMINDER_MINUTES } from '../config/env.js';

const MINUTE = 60_000;

// Sends the "starting soon" warning for every event that is about to begin.
//
// Delivery is at-most-once by design: an event claims its own slot with a
// conditional write before any notification is composed, so a restart, a
// second Render instance or an overlapping tick can never hand a student the
// same reminder twice. The cost of that choice is that a crash between the
// claim and the insert loses one warning, which is the lesser harm.
export const sendUpcomingEventReminders = async ({
  now = new Date(),
  leadMinutes = EVENT_REMINDER_MINUTES
} = {}) => {
  const windowEnd = new Date(now.getTime() + leadMinutes * MINUTE);

  const due = await Event.find({
    date: { $gt: now, $lte: windowEnd },
    reminderSentAt: null,
    status: { $ne: 'cancelled' }
  })
    .select('title date location club registeredStudents participants')
    .lean();

  if (!due.length) return { events: 0, recipients: 0 };

  let sentEvents = 0;
  let sentRecipients = 0;

  for (const event of due) {
    const claim = await Event.updateOne(
      { _id: event._id, reminderSentAt: null },
      { $set: { reminderSentAt: now } }
    );

    if (claim.modifiedCount !== 1) continue;

    // Anyone who signed up, was marked as attending, saved the event to their
    // in-app calendar, or runs the organising club, all deduplicated into one
    // warning per person.
    const audience = new Set();

    for (const list of [event.registeredStudents, event.participants]) {
      list?.forEach((id) => id && audience.add(String(id)));
    }

    const savedBy = await User.find({ calendarEvents: event._id })
      .select('_id')
      .lean();

    savedBy.forEach((user) => audience.add(String(user._id)));

    if (event.club) {
      const organiser = await Club.findById(event.club)
        .select('admin')
        .lean();

      if (organiser?.admin) audience.add(String(organiser.admin));
    }

    if (!audience.size) continue;

    // eventReminders is the toggle on the Account settings page. Only an
    // explicit false silences someone, so records predating the field keep
    // receiving their warnings.
    const targets = await User.find({
      _id: { $in: [...audience] },
      eventReminders: { $ne: false }
    })
      .select('_id')
      .lean();

    if (!targets.length) continue;

    const minutes = Math.max(
      1,
      Math.round((new Date(event.date).getTime() - now.getTime()) / MINUTE)
    );

    await Notification.insertMany(
      targets.map((user) => ({
        user: user._id,
        title: `${event.title} starts in ${minutes} min`,
        message:
          `Starts in ${minutes} minute${minutes === 1 ? '' : 's'} at ` +
          `${event.location || 'the venue'}. Head over so you are not late.`,
        type: 'reminder',
        event: event._id
      })),
      { ordered: false }
    );

    sentEvents += 1;
    sentRecipients += targets.length;
  }

  return { events: sentEvents, recipients: sentRecipients };
};

// A plain interval keeps the dependency list unchanged. The sweep runs every
// minute (or sooner, if the lead window is tighter than that), which is well
// inside the granularity a "30 minutes to go" notice needs.
export const startReminderScheduler = ({
  leadMinutes = EVENT_REMINDER_MINUTES,
  intervalMs = Math.min(MINUTE, Math.max(5_000, leadMinutes * MINUTE))
} = {}) => {
  const tick = async () => {
    try {
      const { events, recipients } = await sendUpcomingEventReminders({
        leadMinutes
      });

      if (events) {
        console.log(
          `[reminders] warned ${recipients} student(s) about ${events} event(s)`
        );
      }
    } catch (error) {
      // Never let a bad sweep take the API down; the next tick retries.
      console.error('Event reminder sweep failed:', error.message);
    }
  };

  const timer = setInterval(tick, intervalMs);

  // The HTTP listener keeps the process alive, so the sweep must not.
  timer.unref?.();

  // Catch up on warnings that fell due while the API was restarting.
  tick();

  return () => clearInterval(timer);
};
