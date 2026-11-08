import app from './app.js';
import connectDB from './config/db.js';
import { PORT, assertProductionConfig } from './config/env.js';
import { ensureAchievementCatalog } from './services/xpService.js';
import { startReminderScheduler } from './services/reminderService.js';

assertProductionConfig();

const start = async () => {
  await connectDB();

  // Insert-only by slug, so this adds badges a deploy introduced without
  // reverting an admin's edits. Non-fatal: the catalog is re-checked lazily
  // the first time a leaderboard or profile asks for it.
  try {
    await ensureAchievementCatalog();
  } catch (error) {
    console.error('Achievement catalog seed failed:', error.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // "Starts in 30 minutes" depends on the clock rather than on anyone opening
  // a page, so the API process owns the sweep.
  startReminderScheduler();
};

start();
