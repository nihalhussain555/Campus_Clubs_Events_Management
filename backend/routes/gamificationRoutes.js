import express from 'express';

import {
  verifyToken,
  verifyAdmin,
  requireRoles,
  ROLES
} from '../middleware/authMiddleware.js';

import {
  gamificationReadLimiter,
  gamificationWriteLimiter
} from '../middleware/rateLimiters.js';

import {
  getGamificationRules,
  getStudentLeaderboard,
  getClubLeaderboard,
  getClubStanding,
  getMyGamification,
  getMyXpHistory,
  listAchievements,
  createAchievement,
  updateAchievement,
  awardPoints,
  reverseAward,
  recordWinners,
  creditOrganizers,
  recompute,
  getAnalytics,
  getSuspiciousActivity,
  exportLeaderboard,
  getStudentXpTable
} from '../controllers/gamificationController.js';

const router = express.Router();

// Every gamification endpoint is authenticated: the board shows student names,
// so an unauthenticated read would leak the campus roster to anyone with a URL.
router.use(verifyToken, gamificationReadLimiter);

// ---------------------------------------------------------------- config
// Read-only, and read by the leaderboard page on mount.
router.get('/rules', getGamificationRules);

// ---------------------------------------------------------------- student board
router.get('/students', getStudentLeaderboard);

router.get('/students/me', getMyGamification);

router.get('/xp/history', getMyXpHistory);

router.get('/achievements', listAchievements);

// ---------------------------------------------------------------- club board
router.get('/clubs', getClubLeaderboard);

router.get('/clubs/:id', getClubStanding);

// ---------------------------------------------------------------- writes
// Admins and club leaders only; the controller then checks that a leader
// actually runs the event the credit is being booked against.
router.post('/awards', gamificationWriteLimiter, requireRoles(ROLES.ADMIN, ROLES.CLUB_LEADER), awardPoints);

router.post(
  '/events/:eventId/winners',
  gamificationWriteLimiter,
  requireRoles(ROLES.ADMIN, ROLES.CLUB_LEADER),
  recordWinners
);

router.post(
  '/events/:eventId/organizer-credit',
  gamificationWriteLimiter,
  requireRoles(ROLES.ADMIN, ROLES.CLUB_LEADER),
  creditOrganizers
);

router.delete('/awards/:id', gamificationWriteLimiter, verifyAdmin, reverseAward);

router.post('/achievements', gamificationWriteLimiter, verifyAdmin, createAchievement);

router.put(
  '/achievements/:id',
  gamificationWriteLimiter,
  verifyAdmin,
  updateAchievement
);

// ---------------------------------------------------------------- admin
router.get('/analytics', verifyAdmin, getAnalytics);

router.get('/suspicious', verifyAdmin, getSuspiciousActivity);

router.get('/export', verifyAdmin, exportLeaderboard);

router.get('/xp-totals', verifyAdmin, getStudentXpTable);

// Rebuilds the ledger-derived caches for the whole campus, so it writes
// everywhere and stays admin-only with its own tighter budget.
router.post('/recompute', gamificationWriteLimiter, verifyAdmin, recompute);

export default router;
