import mongoose from 'mongoose';

import Event from '../models/Event.js';
import User from '../models/User.js';

// The calendar is a personal view of the campus schedule, so it holds
// references rather than copies of event data. These caps keep one student from
// growing their own document past the 16 MB MongoDB limit.
const MAX_CALENDAR_EVENTS = 100;
const MAX_CALENDAR_NOTES = 200;
const MAX_NOTE_LENGTH = 240;

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const isObjectId = (id) =>
  typeof id === 'string' &&
  /^[0-9a-fA-F]{24}$/.test(id) &&
  mongoose.Types.ObjectId.isValid(id);

const isDay = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 31;

const isMonth = (value) =>
  Number.isInteger(value) && value >= 0 && value <= 11;

const isYear = (value) =>
  Number.isInteger(value) && value >= 1970 && value <= 9999;

// Adds one day's worth of blanks so an out-of-range month or a 31st of April
// reads as an invalid date instead of silently rolling over to next month.
const isRealDate = (day, month, year) => {
  const date = new Date(Date.UTC(year, month, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day
  );
};

const eventProjection =
  'title description date endDate location category status activityType club ' +
  'registeredStudents participants';

// Reads the caller's calendar document fields in one round trip.
const loadCalendar = async (userId) => {
  const user = await User.findById(userId)
    .select('calendarEvents calendarNotes eventReminders')
    .populate({
      path: 'calendarEvents',
      select: eventProjection,
      populate: { path: 'club', select: 'clubName' }
    });

  // An organiser can delete an event someone had saved, which leaves a dangling
  // reference behind. Those entries simply disappear from the calendar instead
  // of rendering an empty card.
  const events = (user?.calendarEvents || [])
    .filter(Boolean)
    .map((doc) => {
      const event = doc.toObject();

      const mine = [
        event.registeredStudents || [],
        event.participants || []
      ].some((list) =>
        list.some((entry) => String(entry?._id ?? entry) === String(userId))
      );

      // The attendance rosters are privileged; the calendar only needs to know
      // whether the caller is on one.
      delete event.registeredStudents;
      delete event.participants;

      return { ...event, isRegistered: mine };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const notes = (user?.calendarNotes || [])
    .map((note) => ({
      id: String(note._id),
      day: note.day,
      month: note.month,
      year: note.year,
      text: note.text
    }))
    .sort(
      (a, b) =>
        a.year - b.year || a.month - b.month || a.day - b.day
    );

  return {
    events,
    notes,
    // The page states plainly whether the pre-start warnings are armed, so it
    // needs the same flag the sweep honours.
    remindersEnabled: user?.eventReminders !== false
  };
};

/* =========================================================
   GET MY CALENDAR
   GET /api/calendar
========================================================= */

export const getMyCalendar = async (req, res) => {
  try {
    const payload = await loadCalendar(req.user.id);

    return res.status(200).json({
      success: true,
      count: payload.events.length,
      ...payload
    });
  } catch (error) {
    console.error('Get calendar error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load your calendar',
      error: error.message
    });
  }
};

/* =========================================================
   SAVE AN EVENT TO THE CALENDAR
   POST /api/calendar/events
========================================================= */

export const addCalendarEvent = async (req, res) => {
  try {
    const { eventId } = req.body || {};

    if (!isObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid event id is required'
      });
    }

    const event = await Event.findById(eventId).select('title date');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // $addToSet keeps a double click idempotent, and the $expr size guard makes
    // the cap part of the same atomic write instead of a read-then-write race.
    const result = await User.updateOne(
      {
        _id: req.user.id,
        $expr: {
          $lt: [{ $size: { $ifNull: ['$calendarEvents', []] } }, MAX_CALENDAR_EVENTS]
        }
      },
      { $addToSet: { calendarEvents: toObjectId(eventId) } }
    );

    if (result.modifiedCount === 1) {
      const { events, notes, remindersEnabled } = await loadCalendar(req.user.id);

      return res.status(201).json({
        success: true,
        message: `"${event.title}" added to your calendar`,
        already: false,
        events,
        notes,
        remindersEnabled
      });
    }

    if (result.matchedCount === 0) {
      return res.status(409).json({
        success: false,
        message: `Your calendar is full. Remove an event before adding another (limit ${MAX_CALENDAR_EVENTS}).`
      });
    }

    const { events, notes, remindersEnabled } = await loadCalendar(req.user.id);

    return res.status(200).json({
      success: true,
      message: `"${event.title}" is already in your calendar`,
      already: true,
      events,
      notes,
      remindersEnabled
    });
  } catch (error) {
    console.error('Add calendar event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to add the event to your calendar',
      error: error.message
    });
  }
};

/* =========================================================
   REMOVE AN EVENT FROM THE CALENDAR
   DELETE /api/calendar/events/:eventId
========================================================= */

export const removeCalendarEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!isObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid event id is required'
      });
    }

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { calendarEvents: toObjectId(eventId) } }
    );

    const { events, notes, remindersEnabled } = await loadCalendar(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Removed from your calendar',
      eventId,
      events,
      notes,
      remindersEnabled
    });
  } catch (error) {
    console.error('Remove calendar event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to remove the event from your calendar',
      error: error.message
    });
  }
};

/* =========================================================
   ADD A DAY NOTE
   POST /api/calendar/notes
========================================================= */

export const addCalendarNote = async (req, res) => {
  try {
    const { day, month, year, text } = req.body || {};

    const note = {
      day: Number(day),
      month: Number(month),
      year: Number(year),
      text: typeof text === 'string' ? text.trim() : ''
    };

    if (
      !isDay(note.day) ||
      !isMonth(note.month) ||
      !isYear(note.year) ||
      !isRealDate(note.day, note.month, note.year)
    ) {
      return res.status(400).json({
        success: false,
        message: 'The note date is not a real calendar day'
      });
    }

    if (!note.text) {
      return res.status(400).json({
        success: false,
        message: 'Write something before saving the note'
      });
    }

    if (note.text.length > MAX_NOTE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Notes are limited to ${MAX_NOTE_LENGTH} characters`
      });
    }

    const result = await User.updateOne(
      {
        _id: req.user.id,
        $expr: {
          $lt: [{ $size: { $ifNull: ['$calendarNotes', []] } }, MAX_CALENDAR_NOTES]
        }
      },
      { $push: { calendarNotes: note } }
    );

    if (result.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message: `Your calendar holds too many notes (limit ${MAX_CALENDAR_NOTES}). Delete one first.`
      });
    }

    const { events, notes, remindersEnabled } = await loadCalendar(req.user.id);

    return res.status(201).json({
      success: true,
      message: 'Note saved',
      events,
      notes,
      remindersEnabled
    });
  } catch (error) {
    console.error('Add calendar note error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save the note',
      error: error.message
    });
  }
};

/* =========================================================
   DELETE A DAY NOTE
   DELETE /api/calendar/notes/:noteId
========================================================= */

export const removeCalendarNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    if (!isObjectId(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid note id is required'
      });
    }

    const result = await User.updateOne(
      { _id: req.user.id },
      { $pull: { calendarNotes: { _id: toObjectId(noteId) } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const { events, notes, remindersEnabled } = await loadCalendar(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Note deleted',
      noteId,
      events,
      notes,
      remindersEnabled
    });
  } catch (error) {
    console.error('Remove calendar note error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete the note',
      error: error.message
    });
  }
};
