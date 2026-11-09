import express from 'express';

import {
  signup,
  login,
  getUserProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  completePasswordSetup,
  createUserByAdmin,
  regenerateTemporaryPassword
} from '../controllers/authController.js';

import {
  verifyToken,
  verifyAdmin,
  verifyPasswordSetupToken
} from '../middleware/authMiddleware.js';

import {
  loginLimiter,
  passwordSetupLimiter
} from '../middleware/rateLimiters.js';

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
  loginLimiter,
  login
);

// Exchange the restricted setup token for a real session. Public in the sense
// that it takes no session token, but verifyPasswordSetupToken below is a hard
// gate: without a valid setup token nothing happens.
router.post(
  '/complete-password-setup',
  passwordSetupLimiter,
  verifyPasswordSetupToken,
  completePasswordSetup
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

// Create an account and issue a one-time temporary password
router.post(
  '/users',
  verifyToken,
  verifyAdmin,
  createUserByAdmin
);

// Issue a fresh temporary password, invalidating the previous one
router.post(
  '/users/:id/temporary-password',
  verifyToken,
  verifyAdmin,
  regenerateTemporaryPassword
);


export default router;