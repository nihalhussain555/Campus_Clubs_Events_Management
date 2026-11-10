// Temporary E2E harness for the External Events feature.
// Boots the real Express app against an in-memory MongoDB on 127.0.0.1:5055,
// seeds three accounts and two clubs, then stays alive for browser testing.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();

process.env.NODE_ENV = 'development';
process.env.MONGO_URI = mongod.getUri('campus_e2e');
process.env.JWT_SECRET = 'e2e_only_secret_not_for_real_use';
process.env.CORS_ORIGINS = 'http://127.0.0.1:3000,http://localhost:3000';
delete process.env.GROQ_API_KEY;

const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.MONGO_URI);

const app = (await import('./app.js')).default;
const User = (await import('./models/User.js')).default;
const Club = (await import('./models/Club.js')).default;

const BASE = 'http://127.0.0.1:5055/api';

await new Promise((resolve) => {
  app.listen(5055, '127.0.0.1', resolve);
});

const post = async (path, body, token) => {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  return { status: response.status, body: await response.json() };
};

const PASSWORD = 'CampusExt#2026';

const accounts = [
  { name: 'Erin External', email: 'erin.e2e@test.dev', role: 'student' },
  { name: 'Eli External', email: 'eli.e2e@test.dev', role: 'club_leader' },
  { name: 'Elle Second', email: 'elle.e2e@test.dev', role: 'club_leader' },
  { name: 'Ola Admin', email: 'ola.e2e@test.dev', role: 'admin' }
];

for (const account of accounts) {
  const created = await post('/auth/signup', {
    name: account.name,
    email: account.email,
    password: PASSWORD,
    department: 'Computer Science',
    course: 'B.Tech'
  });

  if (created.status !== 201 && created.status !== 200) {
    console.log('signup failed', created.status, created.body);
    continue;
  }

  await User.updateOne(
    { email: account.email },
    { $set: { role: account.role } }
  );
}

const robotics = await Club.create({
  clubName: 'Robotics Society',
  description: 'Builds things that move.',
  category: 'Technology',
  admin: (await User.findOne({ email: 'eli.e2e@test.dev' }))._id,
  members: []
});

const drama = await Club.create({
  clubName: 'Drama Circle',
  description: 'Plays, improv and stage crew.',
  category: 'Arts',
  admin: (await User.findOne({ email: 'elle.e2e@test.dev' }))._id,
  members: []
});

console.log(
  JSON.stringify(
    {
      ready: true,
      mongo: process.env.MONGO_URI,
      robotics: String(robotics._id),
      drama: String(drama._id),
      users: await User.find({}, 'name email role').lean()
    },
    null,
    2
  )
);
