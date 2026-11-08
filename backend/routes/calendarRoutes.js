import express from 'express';

import {
  addCalendarEvent,
  addCalendarNote,
  getMyCalendar,
  removeCalendarEvent,
  removeCalendarNote
} from '../controllers/calendarController.js';

import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every calendar route is private: it reads and writes the caller's own user
// document, so an unauthenticated request has no subject to resolve.
router.use(verifyToken);

router.get('/', getMyCalendar);

router.post('/events', addCalendarEvent);

router.delete('/events/:eventId', removeCalendarEvent);

router.post('/notes', addCalendarNote);

router.delete('/notes/:noteId', removeCalendarNote);

export default router;
