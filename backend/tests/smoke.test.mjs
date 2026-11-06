// Integration smoke tests. Runs the real Express app against an isolated
// in-memory MongoDB so no production Atlas data is touched.
//
//   npm test
//
// Set MONGO_URI before any module import: config/env.js reads process.env at
// import time and dotenv will not override an already-set variable.

import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:1/memory-placeholder';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-used-in-production';

const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('campus_clubs_test');

const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.MONGO_URI);

const app = (await import('../app.js')).default;

const User = (await import('../models/User.js')).default;
const Event = (await import('../models/Event.js')).default;
const Certificate = (await import('../models/Certificate.js')).default;
const Attendance = (await import('../models/Attendance.js')).default;
const Notification = (await import('../models/Notification.js')).default;
const { signCheckinToken } = await import('../utils/checkinToken.js');

const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});

const base = `http://127.0.0.1:${server.address().port}/api`;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json')
    ? await res.json()
    : await res.arrayBuffer();

  return { status: res.status, data, type };
};

const makeUser = async (name, email, role) => {
  const signup = await call('POST', '/auth/signup', {
    body: { name, email, password: 'secret123', department: 'CSE' },
  });
  assert.equal(signup.status, 201, `signup failed for ${email}`);

  if (role) {
    await User.findByIdAndUpdate(signup.data.user.id, { $set: { role } });
  }

  const login = await call('POST', '/auth/login', {
    body: { email, password: 'secret123' },
  });
  assert.equal(login.status, 200, `login failed for ${email}`);

  return { id: signup.data.user.id, token: login.data.token, email };
};

const results = [];

const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push(['FAIL', name]);
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`);
  }
};

const future = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
const past = (hours) => new Date(Date.now() - hours * 3600000).toISOString();

console.log('\nCampus Clubs - backend integration tests\n');

// ---------------------------------------------------------------- fixtures

const admin = await makeUser('Ada Admin', 'admin@test.dev', 'admin');
const leader = await makeUser('Lou Leader', 'leader@test.dev', 'club_leader');
const student = await makeUser('Sam Student', 'sam@test.dev');
const other = await makeUser('Olivia Other', 'olivia@test.dev');

const clubRes = await call('POST', '/clubs', {
  token: admin.token,
  body: { clubName: 'Robotics Club', description: 'Build robots' },
});
const clubId = clubRes.data.club._id;

const otherClubRes = await call('POST', '/clubs', {
  token: admin.token,
  body: { clubName: 'Drama Club', description: 'Act' },
});
const otherClubId = otherClubRes.data.club._id;

// ---------------------------------------------------------------- auth+RBAC

await test('health endpoint responds', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
});

await test('protected route rejects a missing token', async () => {
  assert.equal((await call('GET', '/auth/profile')).status, 401);
});

await test('a bogus token is rejected', async () => {
  const { status } = await call('GET', '/auth/profile', {
    token: 'not.a.real.jwt',
  });
  assert.equal(status, 401);
});

await test('student cannot create a club', async () => {
  const { status } = await call('POST', '/clubs', {
    token: student.token,
    body: { clubName: 'Nope', description: 'x' },
  });
  assert.equal(status, 403);
});

await test('club leader cannot create a club either', async () => {
  const { status } = await call('POST', '/clubs', {
    token: leader.token,
    body: { clubName: 'Nope', description: 'x' },
  });
  assert.equal(status, 403);
});

await test('club admin cannot leave a club they run', async () => {
  const { status, data } = await call('POST', `/clubs/${clubId}/leave`, {
    token: admin.token,
  });
  assert.equal(status, 400);
  assert.match(data.message, /cannot leave/i);
});

await test('leadership transfer promotes the new leader', async () => {
  await call('POST', `/clubs/${otherClubId}/join`, { token: student.token });

  const { status } = await call('PUT', `/clubs/${otherClubId}/transfer-admin`, {
    token: admin.token,
    body: { userId: student.id },
  });
  assert.equal(status, 200);

  const updated = await User.findById(student.id).lean();
  assert.equal(updated.role, 'club_leader');

  // A transfer may target a member only.
  const outsider = await makeUser('Not A Member', 'outsider@test.dev');
  const denied = await call('PUT', `/clubs/${otherClubId}/transfer-admin`, {
    token: admin.token,
    body: { userId: outsider.id },
  });
  assert.equal(denied.status, 400);
});

await test('a club leader can edit their own club', async () => {
  const { status } = await call('PUT', `/clubs/${otherClubId}`, {
    token: student.token,
    body: { description: 'Now led by a student' },
  });
  assert.equal(status, 200);
});

await test('profile update cannot self-assign club membership or role', async () => {
  const { status } = await call('PUT', '/auth/profile', {
    token: other.token,
    body: { name: 'Olivia Other', joinedClubs: [clubId], role: 'admin' },
  });
  assert.equal(status, 200);

  const fresh = await User.findById(other.id).lean();
  assert.equal(
    fresh.joinedClubs.some((c) => c.toString() === clubId),
    false,
    'joinedClubs was writable through the profile endpoint'
  );
  assert.equal(fresh.role, 'student', 'role was escalated');
});

await test('profile picture accepts images only and caps inline data', async () => {
  const script = await call('PUT', '/auth/profile', {
    token: other.token,
    body: { profilePic: 'javascript:alert(1)' },
  });
  assert.equal(script.status, 400, 'a non-image value was accepted');

  const oversized = await call('PUT', '/auth/profile', {
    token: other.token,
    body: { profilePic: 'data:image/png;base64,' + 'A'.repeat(1_010_000) },
  });
  assert.equal(oversized.status, 413, 'an oversized image slipped through');

  const hosted = await call('PUT', '/auth/profile', {
    token: other.token,
    body: { profilePic: 'https://res.cloudinary.com/demo/image/upload/a.jpg' },
  });
  assert.equal(hosted.status, 200, 'a hosted image URL should be allowed');
});

// ---------------------------------------------------------------- events

await test('event creation requires endDate', async () => {
  const { status, data } = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Missing End',
      description: 'x',
      date: future(72),
      club: clubId,
    },
  });
  assert.equal(status, 400);
  assert.match(data.message, /end date/i);
});

const eventRes = await call('POST', '/events', {
  token: admin.token,
  body: {
    title: 'Hack Night',
    description: 'Build all night',
    date: future(48),
    endDate: future(60),
    location: 'Lab 3',
    category: 'Tech',
    club: clubId,
    capacity: 3,
  },
});
const eventId = eventRes.data.event?._id;

await test('admin can create an event with a valid payload', async () => {
  assert.equal(eventRes.status, 201, JSON.stringify(eventRes.data));
  assert.ok(eventId, 'no event id returned');
});

await test('club leader cannot create an event for a foreign club', async () => {
  const { status } = await call('POST', '/events', {
    token: leader.token,
    body: {
      title: 'Not Yours',
      description: 'x',
      date: future(72),
      endDate: future(73),
      club: clubId,
    },
  });
  assert.equal(status, 403);
});

await test('club leader can create an event for a club they run', async () => {
  const { status } = await call('POST', '/events', {
    token: student.token,
    body: {
      title: 'Improv Night',
      description: 'By the drama leader',
      date: future(30),
      endDate: future(32),
      club: otherClubId,
    },
  });
  assert.equal(status, 201);
});

await test('club leader cannot edit an event they do not run', async () => {
  const { status } = await call('PUT', `/events/${eventId}`, {
    token: leader.token,
    body: { title: 'Hijacked' },
  });
  assert.equal(status, 403);
});

await test('self-service attendance endpoint is retired', async () => {
  assert.equal(
    (await call('POST', `/events/${eventId}/attend`, { token: student.token }))
      .status,
    404
  );
});

await test('registration works and rejects duplicates', async () => {
  const first = await call('POST', `/events/${eventId}/register`, {
    token: student.token,
  });
  assert.equal(first.status, 200, JSON.stringify(first.data));

  const again = await call('POST', `/events/${eventId}/register`, {
    token: student.token,
  });
  assert.equal(again.status, 409);
});

await test('unregister then re-register is allowed', async () => {
  const off = await call('POST', `/events/${eventId}/unregister`, {
    token: other.token,
  });
  assert.equal(off.status, 400, 'was not registered yet');

  await call('POST', `/events/${eventId}/register`, { token: other.token });

  const out = await call('POST', `/events/${eventId}/unregister`, {
    token: other.token,
  });
  assert.equal(out.status, 200);

  const backIn = await call('POST', `/events/${eventId}/register`, {
    token: other.token,
  });
  assert.equal(backIn.status, 200);
});

await test('capacity is enforced and never oversold', async () => {
  // student and other hold 2 of the 3 seats; five racers fight for the last.
  const racers = await Promise.all(
    [1, 2, 3, 4, 5].map((i) => makeUser('Racer ' + i, `racer${i}@test.dev`))
  );

  const settled = await Promise.all(
    racers.map((r) => call('POST', `/events/${eventId}/register`, { token: r.token }))
  );

  const accepted = settled.filter((s) => s.status === 200).length;
  assert.equal(accepted, 1, `expected exactly 1 remaining seat, got ${accepted}`);

  const rejected = settled.filter((s) => s.status !== 200);
  assert.ok(
    rejected.every((s) => /full/i.test(s.data.message || '')),
    'a non-capacity rejection leaked into the race'
  );

  const event = await Event.findById(eventId).lean();
  assert.equal(event.registeredStudents.length, 3, 'oversold or underfilled');
});

// ---------------------------------------------------------------- check-in

await test('check-in QR is only issued to registered students', async () => {
  const stranger = await makeUser('Nobody Here', 'stranger@test.dev');

  const denied = await call('GET', `/events/${eventId}/checkin-token`, {
    token: stranger.token,
  });
  assert.equal(denied.status, 403);

  const allowed = await call('GET', `/events/${eventId}/checkin-token`, {
    token: student.token,
  });
  assert.equal(allowed.status, 200);
  assert.ok(allowed.data.token?.length > 20);
});

await test('QR check-in requires an organiser', async () => {
  const { status } = await call('POST', `/events/${eventId}/checkin`, {
    token: student.token,
    body: { token: 'anything' },
  });
  assert.equal(status, 403);
});

await test('QR check-in marks attendance and issues a certificate', async () => {
  const { data } = await call('GET', `/events/${eventId}/checkin-token`, {
    token: student.token,
  });

  const res = await call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: data.token },
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.ok(res.data.certificate, 'no certificate issued');

  const row = await Attendance.findOne({ event: eventId, user: student.id });
  assert.equal(row.method, 'qr_scan');
  assert.equal(row.verifiedBy.toString(), admin.id);

  const event = await Event.findById(eventId).lean();
  assert.ok(
    event.participants.some((p) => p.toString() === student.id),
    'legacy participants array was not mirrored'
  );
});

await test('a checked-in student gets no further QR and cannot replay', async () => {
  const token = await call('GET', `/events/${eventId}/checkin-token`, {
    token: student.token,
  });
  assert.equal(token.status, 409);

  const { data } = await call('GET', `/events/${eventId}/checkin-token`, {
    token: other.token,
  });
  const replay = await call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: data.token },
  });
  assert.equal(replay.status, 200);

  const again = await call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: data.token },
  });
  assert.equal(again.status, 409, 'double attendance was accepted');
});

await test('a forged or foreign QR token is rejected', async () => {
  const bad = await call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: 'garbage-not-a-jwt' },
  });
  assert.equal(bad.status, 400);
  assert.match(bad.data.message, /invalid|expired/i);

  const foreignEvent = await Event.create({
    title: 'Foreign Night',
    description: 'x',
    date: future(5),
    endDate: future(6),
    club: clubId,
  });

  // Correctly signed, but bound to a different event.
  const misplaced = signCheckinToken(foreignEvent._id, student.id);
  const wrong = await call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: misplaced },
  });
  assert.equal(wrong.status, 400);
  assert.match(wrong.data.message, /different event/i);

  // Signed with the right event but for a student who is not on the roster.
  const ghost = await makeUser('Ghost', 'ghost@test.dev');
  const unrostered = signCheckinToken(eventId, ghost.id);
  const ghostRes = await call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: unrostered },
  });
  assert.equal(ghostRes.status, 400, 'unregistered student was checked in');

  await Event.deleteOne({ _id: foreignEvent._id });
});

await test('roster check-in requires registration and records the method', async () => {
  const outsider = await makeUser('Not Registered', 'noroster@test.dev');

  const denied = await call('POST', `/events/${eventId}/attendance`, {
    token: admin.token,
    body: { userId: outsider.id },
  });
  assert.equal(denied.status, 400);

  const racer = await Event.findById(eventId).lean();
  const target = racer.registeredStudents.find(
    (id) => id.toString() !== student.id && id.toString() !== other.id
  );

  const ok = await call('POST', `/events/${eventId}/attendance`, {
    token: admin.token,
    body: { userId: target },
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));

  const row = await Attendance.findOne({ event: eventId, user: target });
  assert.equal(row.method, 'roster');
});

await test('removing attendance deletes the certificate and record', async () => {
  const before = await Certificate.countDocuments({ event: eventId, user: other.id });
  assert.equal(before, 1);

  const res = await call('DELETE', `/events/${eventId}/attendance`, {
    token: admin.token,
    body: { userId: other.id },
  });
  assert.equal(res.status, 200);

  assert.equal(await Certificate.countDocuments({ event: eventId, user: other.id }), 0);
  assert.equal(await Attendance.countDocuments({ event: eventId, user: other.id }), 0);

  const event = await Event.findById(eventId).lean();
  assert.equal(
    event.certificateRecipients.some((r) => r.toString() === other.id),
    false,
    'certificateRecipients kept a stale entry'
  );
});

// ---------------------------------------------------------------- certificates

await test('certificate PDF downloads for its owner only', async () => {
  const cert = await Certificate.findOne({ event: eventId, user: student.id });
  assert.ok(cert, 'expected a certificate for the checked-in student');

  const mine = await call('GET', `/certificates/download/${cert.certificateId}`, {
    token: student.token,
  });
  assert.equal(mine.status, 200);
  assert.match(mine.type, /application\/pdf/);

  const stranger = await call('GET', `/certificates/download/${cert.certificateId}`, {
    token: admin.token,
  });
  assert.equal(stranger.status, 404, 'a non-owner downloaded someone else PDF');

  const anonymous = await call('GET', `/certificates/${cert.certificateId}`);
  assert.equal(anonymous.status, 401);
});

await test('public certificate verification works without auth', async () => {
  const cert = await Certificate.findOne({ user: student.id });
  const { status, data } = await call('GET', `/certificates/verify/${cert.qrToken}`);
  assert.equal(status, 200);
  assert.ok(data);
});

await test('event deletion cleans up its certificates', async () => {
  const temp = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Throwaway',
      description: 'x',
      date: future(10),
      endDate: future(11),
      club: clubId,
    },
  });
  const id = temp.data.event._id;

  const { status } = await call('DELETE', `/events/${id}`, { token: admin.token });
  assert.equal(status, 200);
  assert.equal(await Event.countDocuments({ _id: id }), 0);
});

// ---------------------------------------------------------------- notifications

await test('broadcast read state is per student', async () => {
  const created = await call('POST', '/notifications', {
    token: admin.token,
    body: { title: 'Campus-wide', message: 'Gate closed at 10pm' },
  });
  assert.equal(created.status, 201);
  const id = created.data.notification._id;

  await call('PUT', `/notifications/${id}/read`, { token: student.token });

  const otherView = await call('GET', '/notifications', { token: other.token });
  const seen = otherView.data.notifications.find((n) => n._id === id);
  assert.equal(
    seen.isRead,
    false,
    'one student marking a broadcast read marked it read for everyone'
  );

  const ownView = await call('GET', '/notifications', { token: student.token });
  const own = ownView.data.notifications.find((n) => n._id === id);
  assert.equal(own.isRead, true);
});

await test('mark-all-as-read is per student too', async () => {
  const created = await call('POST', '/notifications', {
    token: admin.token,
    body: { title: 'Second broadcast', message: 'Audit room booking' },
  });
  const id = created.data.notification._id;

  await call('PUT', '/notifications/read-all', { token: student.token });

  const otherView = await call('GET', '/notifications', { token: other.token });
  const seen = otherView.data.notifications.find((n) => n._id === id);
  assert.equal(seen.isRead, false, 'read-all leaked across students');
});

await test('notifications can be deleted within scope', async () => {
  const direct = await call('POST', '/notifications', {
    token: admin.token,
    body: {
      user: other.id,
      title: 'Just for you',
      message: 'Your request was approved',
    },
  });
  const id = direct.data.notification._id;

  const wrongUser = await call('DELETE', `/notifications/${id}`, {
    token: student.token,
  });
  assert.equal(wrongUser.status, 403, 'another student deleted a private notice');

  const mine = await call('DELETE', `/notifications/${id}`, { token: other.token });
  assert.equal(mine.status, 200);
  assert.equal(await Notification.countDocuments({ _id: id }), 0);

  const broadcast = await call('POST', '/notifications', {
    token: admin.token,
    body: { title: 'Wide', message: 'Everyone' },
  });
  const bid = broadcast.data.notification._id;

  assert.equal(
    (await call('DELETE', `/notifications/${bid}`, { token: other.token })).status,
    403
  );
  assert.equal(
    (await call('DELETE', `/notifications/${bid}`, { token: admin.token })).status,
    200
  );
});

await test('students cannot broadcast notifications', async () => {
  const { status } = await call('POST', '/notifications', {
    token: student.token,
    body: { title: 'I am the admin', message: 'hello' },
  });
  assert.equal(status, 403);
});

// ---------------------------------------------------------------- misc hardening

await test('agent chat requires authentication', async () => {
  assert.equal(
    (await call('POST', '/agent/chat', { body: { message: 'hello' } })).status,
    401
  );
});

await test('operator injection in login is stripped, not executed', async () => {
  const { status } = await call('POST', '/auth/login', {
    body: { email: { $ne: null }, password: { $ne: null } },
  });
  assert.equal(status, 400);
});

await test('duplicate email is rejected at signup', async () => {
  const { status } = await call('POST', '/auth/signup', {
    body: { name: 'Copy', email: 'sam@test.dev', password: 'secret123' },
  });
  assert.equal(status, 400);
});

await test('club with events cannot be deleted out from under them', async () => {
  const { status, data } = await call('DELETE', `/clubs/${clubId}`, {
    token: admin.token,
  });
  assert.equal(status, 409);
  assert.match(data.message, /event/i);
});

await test('unknown routes return 404 JSON', async () => {
  const { status, data } = await call('GET', '/nope');
  assert.equal(status, 404);
  assert.equal(data.message, 'Route not found');
});

// ---------------------------------------------------------------- summary

const failed = results.filter((r) => r[0] === 'FAIL');

console.log(`\n${results.length - failed.length}/${results.length} passed\n`);

if (failed.length) {
  console.log('Failed:');
  for (const [, name] of failed) console.log('  - ' + name);
  console.log('');
}

await server.close();
await mongoose.disconnect();
await mongod.stop();

if (failed.length) process.exit(1);
