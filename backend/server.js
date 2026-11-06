import app from './app.js';
import connectDB from './config/db.js';
import { PORT, assertProductionConfig } from './config/env.js';

assertProductionConfig();

connectDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
