import express from 'express';
import {
  createClub,
  getAllClubs,
  getClubById,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub,
  transferClubAdmin
} from '../controllers/clubController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';
import { requireClubManager } from '../middleware/permissions.js';

const router = express.Router();

// Public routes (anyone can view)
router.get('/', getAllClubs);
router.get('/:id', getClubById);

// Creating a club stays admin-controlled; leadership within an existing club is
// handed over through the transfer route below.
router.post('/', verifyToken, verifyAdmin, createClub);

// The club's own leader may edit it, not just platform admins.
router.put('/:id', verifyToken, requireClubManager(), updateClub);
router.delete('/:id', verifyToken, requireClubManager(), deleteClub);

router.put(
  '/:id/transfer-admin',
  verifyToken,
  requireClubManager(),
  transferClubAdmin
);

// Student routes
router.post('/:id/join', verifyToken, joinClub);
router.post('/:id/leave', verifyToken, leaveClub);

export default router;
