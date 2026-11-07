import rateLimit from 'express-rate-limit';

// Credential stuffing wants many attempts per minute, so login gets a tight
// budget while signup and profile reads stay comfortable for normal use.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts. Please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// Groq calls spend real quota.
export const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'AI assistant is rate limited. Please slow down.' },
});

// Leaderboards are aggregation queries and the frontend refreshes them on a
// timer, so the read budget is generous but not unlimited.
export const gamificationReadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many leaderboard requests. Please slow down.' },
});

// Awarding points writes several documents and re-checks every badge for the
// student, so repeats are throttled hard. Legitimate batch awards stay well
// inside this: one call can credit 50 students.
export const gamificationWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many award requests. Please try again later.' },
});
