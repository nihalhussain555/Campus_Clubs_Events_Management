import express from 'express';
import {
  createClub,
  getAllClubs,
  getClubById,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub
} from '../controllers/clubController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (anyone can view)
router.get('/', getAllClubs);
router.get('/:id', getClubById);

// Protected routes
router.post('/', verifyToken, verifyAdmin, createClub);
router.put('/:id', verifyToken, verifyAdmin, updateClub);
router.delete('/:id', verifyToken, verifyAdmin, deleteClub);

// Student routes
router.post('/:id/join', verifyToken, joinClub);
router.post('/:id/leave', verifyToken, leaveClub);

export default router;
