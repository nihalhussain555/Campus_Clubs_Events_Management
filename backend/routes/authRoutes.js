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
  regenerateTemporaryPassword,
  getSecurityQuestions,
  requestRecoveryQuestion,
  verifyRecoveryAnswer,
  resetPasswordWithRecovery,
  setSecurityQuestion
} from '../controllers/authController.js';

import {
  verifyToken,
  verifyAdmin,
  verifyPasswordSetupToken,
  verifyPasswordAnswerToken,
  verifyPasswordResetToken
} from '../middleware/authMiddleware.js';

import {
  loginLimiter,
  passwordSetupLimiter,
  recoveryStartLimiter,
  recoveryAnswerLimiter
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
// PASSWORD RECOVERY (no email, no OTP)
// =====================================================

// The fixed catalogue of questions, needed by the register form.
router.get(
  '/security-questions',
  getSecurityQuestions
);

// Three steps, one request each, and each step runs on the link the previous
// step issued. The reset step needs no limiter of its own: its link only ever
// exists once the answer already matched.
router.post(
  '/forgot-password/question',
  recoveryStartLimiter,
  requestRecoveryQuestion
);

router.post(
  '/forgot-password/verify',
  recoveryAnswerLimiter,
  verifyPasswordAnswerToken,
  verifyRecoveryAnswer
);

router.post(
  '/forgot-password/reset',
  verifyPasswordResetToken,
  resetPasswordWithRecovery
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

// Choose or replace the recovery question. Needs the current password, so a
// stolen session cannot plant an attacker's own question.
router.put(
  '/security-question',
  verifyToken,
  setSecurityQuestion
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