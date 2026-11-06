import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const PORT = Number(process.env.PORT) || 5000;

export const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  (isProduction ? null : 'mongodb://localhost:27017/club_events');

// A compiled-in fallback secret lets anyone forge tokens, so production must
// supply one. Development keeps a fixed value so local resets still work.
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (isProduction ? null : 'development_only_jwt_secret_do_not_use_in_prod');

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Comma-separated so both Vercel preview and production can be allowed.
export const CORS_ORIGINS = (
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  process.env.CORS_ORIGINS ||
  ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const assertProductionConfig = () => {
  if (!isProduction) return;

  const missing = [];
  if (!MONGO_URI) missing.push('MONGO_URI (or MONGODB_URI)');
  if (!JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length) {
    throw new Error(
      `Refusing to start in production. Missing: ${missing.join(', ')}`
    );
  }

  if (!CORS_ORIGINS.length) {
    console.warn(
      '[config] CLIENT_URL is not set - CORS will accept requests from any ' +
        'origin. Set CLIENT_URL to your Vercel domain to lock this down.'
    );
  }
};
