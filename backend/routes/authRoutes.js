import express from 'express';

import {
  signup,
  login,
  getUserProfile,
  updateProfile,
  changePassword,
  getAllUsers
} from '../controllers/authController.js';

import {
  verifyToken,
  verifyAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();


// =====================================================
// PUBLIC AUTH ROUTES
// =====================================================

// Register new student
router.post(
  '/signup',
  signup
);

// Login
router.post(
  '/login',
  login
);


// =====================================================
// USER PROFILE ROUTES
// =====================================================

// Get logged-in user's profile
router.get(
  '/profile',
  verifyToken,
  getUserProfile
);

// Update logged-in user's profile
router.put(
  '/profile',
  verifyToken,
  updateProfile
);


// =====================================================
// PASSWORD
// =====================================================

// Change logged-in user's password
router.put(
  '/change-password',
  verifyToken,
  changePassword
);


// =====================================================
// ADMIN ROUTES
// =====================================================

// Get all users
router.get(
  '/users',
  verifyToken,
  verifyAdmin,
  getAllUsers
);


export default router;