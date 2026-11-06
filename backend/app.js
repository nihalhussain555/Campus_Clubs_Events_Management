import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CORS_ORIGINS } from './config/env';
import { authLimiter, agentLimiter } from './middleware/rateLimiters.js';
import authRoutes from './routes/authRoutes.js';
import clubRoutes from './routes/clubRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import { sanitizeRequest } from './middleware/sanitize.js';

const app = express();

// Render and Vercel both terminate TLS at a proxy, so req.ip must come from
// X-Forwarded-For or every client shares one rate-limit bucket.
app.set('trust proxy', 1);

app.use(
  helmet({
    // Certificate PDFs are fetched cross-origin by the frontend.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowlist = new Set(CORS_ORIGINS);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl, or a native client.
      if (!origin) return callback(null, true);
      if (!allowlist.size) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeRequest);

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/agent', agentLimiter, agentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.message?.includes('not allowed by CORS')) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }

  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : { error: err.message }),
  });
});

export default app;
