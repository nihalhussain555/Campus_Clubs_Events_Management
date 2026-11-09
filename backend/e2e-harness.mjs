// Scratch E2E harness: boots the real Express app against an isolated
// in-memory MongoDB so the UI can be clicked through without touching Atlas.
// Delete after use.
process.env.NODE_ENV = 'development';

const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongod = await MongoMemoryServer.create();

process.env.MONGO_URI = mongod.getUri('e2e_ui');
process.env.JWT_SECRET = 'e2e_only_secret';
process.env.CLIENT_URL =
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173';

const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.MONGO_URI);

const bcrypt = (await import('bcryptjs')).default;
const User = (await import('./models/User.js')).default;

await User.create({
  name: 'E2E Admin',
  email: 'e2eadmin@test.dev',
  password: await bcrypt.hash('Admin!2026', 10),
  role: 'admin',
  department: 'CSE',
});

const app = (await import('./app.js')).default;

// Bound to every interface (IPv4 + IPv6): the frontend's dev API base URL is
// http://localhost:5000, which a browser may resolve to ::1.
app.listen(5000, () => {
  console.log('e2e backend listening on port 5000');
});
