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

// The setup endpoint accepts a token that a legitimate holder may need to
// retry after a validation mistake, so successes are free but guesses are not.
export const passwordSetupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message: 'Too many password setup attempts. Please try again later.',
  },
});

// Password recovery runs without email or OTP, so its two open steps need
// their own budgets. Naming a registered email only reveals a question the
// account already chose in public words, but it is reachable anonymously, so
// it is capped. Checking the answer is the single guessable step in the flow
// and the tightest limit lives there; unlike the setup endpoint, a correct
// answer also counts against it, because a guesser who is right is done.
export const recoveryStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many recovery attempts. Please try again later.',
  },
});

export const recoveryAnswerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'Too many answer attempts. Please try again in a few minutes or ask an administrator to reset your password.',
  },
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
