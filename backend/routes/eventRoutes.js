import express from 'express';

import {
  createEvent,
  getAllEvents,
  getEventById,
  getEventsByClub,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getMyCheckinToken,
  checkInEvent,
  getUpcomingEvents,
  getMyEventHistory,
  markAttendance,
  removeAttendance
} from '../controllers/eventController.js';

import { verifyToken } from '../middleware/authMiddleware.js';
import { requireEventManager } from '../middleware/permissions.js';

const router = express.Router();

// =====================================================
// PUBLIC EVENT ROUTES
// =====================================================

router.get('/', getAllEvents);

router.get('/upcoming', getUpcomingEvents);

// The history and club-scoped paths must be declared before /:id, otherwise
// "history" and "club" are swallowed as an event id and fail CastError.
router.get('/history/my', verifyToken, getMyEventHistory);

router.get('/club/:clubId', getEventsByClub);

// =====================================================
// EVENT BY ID
// =====================================================

router.get('/:id', getEventById);

// =====================================================
// STUDENT REGISTRATION
// =====================================================

router.post('/:id/register', verifyToken, registerForEvent);
router.post('/:id/unregister', verifyToken, unregisterFromEvent);

// The student's own check-in QR, shown on their device for the organiser to
// scan. No certificate is granted by holding this token.
router.get('/:id/checkin-token', verifyToken, getMyCheckinToken);

// =====================================================
// ORGANISER MANAGEMENT (admin or the club leader running the event)
// =====================================================

router.post('/', verifyToken, createEvent);

router.put('/:id', verifyToken, requireEventManager(), updateEvent);

router.delete('/:id', verifyToken, requireEventManager(), deleteEvent);

router.post(
  '/:id/checkin',
  verifyToken,
  requireEventManager(),
  checkInEvent
);

router.post(
  '/:id/attendance',
  verifyToken,
  requireEventManager(),
  markAttendance
);

router.delete(
  '/:id/attendance',
  verifyToken,
  requireEventManager(),
  removeAttendance
);

export default router;
