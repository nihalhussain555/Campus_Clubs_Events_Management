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
  getUpcomingEvents,
  getMyCertificates
} from '../controllers/eventController.js';

import {
  verifyToken,
  verifyAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();


// =====================================================
// PUBLIC ROUTES
// =====================================================

router.get('/', getAllEvents);

router.get('/upcoming', getUpcomingEvents);


// =====================================================
// STUDENT CERTIFICATE ROUTE
// IMPORTANT: keep this BEFORE /:id
// =====================================================

router.get(
  '/certificates/my',
  verifyToken,
  getMyCertificates
);


// =====================================================
// EVENT ROUTES
// =====================================================

router.get('/club/:clubId', getEventsByClub);

router.get('/:id', getEventById);


// =====================================================
// ADMIN ROUTES
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
// STUDENT EVENT ACTIONS
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

export default router;