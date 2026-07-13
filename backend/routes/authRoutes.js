import express from 'express';
import { signup, login, getUserProfile, getAllUsers, updateProfile, changePassword } from '../controllers/authController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.get('/users', verifyToken, verifyAdmin, getAllUsers);

export default router;