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
  attendEvent,
  getUpcomingEvents,
  getMyEventHistory,
  markAttendance,
  removeAttendance
} from '../controllers/eventController.js';

import {
  verifyToken,
  verifyAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();


// =====================================================
// PUBLIC EVENT ROUTES
// =====================================================

router.get(
  '/',
  getAllEvents
);

router.get(
  '/upcoming',
  getUpcomingEvents
);


// =====================================================
// STUDENT EVENT HISTORY
// IMPORTANT: BEFORE /:id
// =====================================================

router.get(
  '/history/my',
  verifyToken,
  getMyEventHistory
);


// =====================================================
// CLUB EVENTS
// IMPORTANT: BEFORE /:id
// =====================================================

router.get(
  '/club/:clubId',
  getEventsByClub
);


// =====================================================
// STUDENT ATTENDANCE
// =====================================================

router.post(
  '/:id/attend',
  verifyToken,
  attendEvent
);


// =====================================================
// EVENT BY ID
// =====================================================

router.get(
  '/:id',
  getEventById
);


// =====================================================
// ADMIN EVENT MANAGEMENT
// =====================================================

router.post(
  '/',
  verifyToken,
  verifyAdmin,
  createEvent
);

router.put(
  '/:id',
  verifyToken,
  verifyAdmin,
  updateEvent
);

router.delete(
  '/:id',
  verifyToken,
  verifyAdmin,
  deleteEvent
);


// =====================================================
// STUDENT REGISTRATION
// =====================================================

router.post(
  '/:id/register',
  verifyToken,
  registerForEvent
);

router.post(
  '/:id/unregister',
  verifyToken,
  unregisterFromEvent
);


// =====================================================
// ADMIN ATTENDANCE
// =====================================================

router.post(
  '/:id/attendance',
  verifyToken,
  verifyAdmin,
  markAttendance
);

router.delete(
  '/:id/attendance',
  verifyToken,
  verifyAdmin,
  removeAttendance
);


export default router;
