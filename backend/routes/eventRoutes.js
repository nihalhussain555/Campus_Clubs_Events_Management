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
  getMyCertificates
} from '../controllers/eventController.js';

import {
  verifyToken,
  verifyAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();


// =====================================================
// PUBLIC EVENT ROUTES
// =====================================================

router.get('/', getAllEvents);

router.get('/upcoming', getUpcomingEvents);


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
// STUDENT CERTIFICATES
// IMPORTANT: BEFORE /:id
// =====================================================

router.get(
  '/certificates/my',
  verifyToken,
  getMyCertificates
);


// =====================================================
// CLUB EVENTS
// =====================================================

router.get(
  '/club/:clubId',
  getEventsByClub
);

router.post(
  '/:id/attend',
  verifyToken,
  attendEvent
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

router.post(
  '/:id/attend',
  verifyToken,
  attendEvent
);

export default router;