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
  getUpcomingEvents
} from '../controllers/eventController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/club/:clubId', getEventsByClub);
router.get('/:id', getEventById);

// Admin routes
router.post('/', verifyToken, verifyAdmin, createEvent);
router.put('/:id', verifyToken, verifyAdmin, updateEvent);
router.delete('/:id', verifyToken, verifyAdmin, deleteEvent);

// Student routes
router.post('/:id/register', verifyToken, registerForEvent);
router.post('/:id/unregister', verifyToken, unregisterFromEvent);

export default router;
