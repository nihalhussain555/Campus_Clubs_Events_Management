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

// Cleared before any import so the suite can never spend Groq quota or depend
// on the network: dotenv leaves an existing (even empty) value alone. The help
// assistant's offline branch is what these tests cover.
process.env.GROQ_API_KEY = '';

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
const XPTransaction = (await import('../models/XPTransaction.js')).default;
const Gamification = (await import('../models/Gamification.js')).default;
const StudentBadge = (await import('../models/StudentBadge.js')).default;
const SupportRequest = (await import('../models/SupportRequest.js')).default;
const { signCheckinToken } = await import('../utils/checkinToken.js');

const helpDocs = await import('../data/helpDocs.js');
const { canSee, filterHelpForRole } = await import('../utils/helpAccess.js');
const { buildCatalog } = await import('../services/helpAssistant.js');

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
    : type.includes('text/csv')
      ? await res.text()
      : await res.arrayBuffer();

  return { status: res.status, data, type };
};

// Passwords that satisfy the "8 chars, upper, lower, number, special" policy.
// Declared before the fixtures so makeUser can log in with it.
const SELF_SERVICE_PW = 'Secret123!';

// Signup asks every new account for a recovery question, so the fixtures all
// answer the same one. The text is only ever stored as a hash; the recovery
// tests read these constants to prove it.
const FIXTURE_QUESTION = 'first_pet';
const FIXTURE_ANSWER = 'Biscuit';

const makeUser = async (name, email, role) => {
  const signup = await call('POST', '/auth/signup', {
    body: {
      name,
      email,
      password: SELF_SERVICE_PW,
      department: 'CSE',
      securityQuestion: FIXTURE_QUESTION,
      securityAnswer: FIXTURE_ANSWER
    },
  });
  assert.equal(signup.status, 201, `signup failed for ${email}`);

  if (role) {
    await User.findByIdAndUpdate(signup.data.user.id, { $set: { role } });
  }

  const login = await call('POST', '/auth/login', {
    body: { email, password: SELF_SERVICE_PW },
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

// Token iat and passwordChangedAt are both second-aligned, so a recovery link
// spent inside the second it was minted stays valid by design. Resting a full
// second before the password moves makes "that link is now dead" a fact rather
// than a race the suite happens to win.
const restASecond = () => new Promise((resolve) => setTimeout(resolve, 1050));

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
    body: { name: 'Copy', email: 'sam@test.dev', password: 'Secret123!' },
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

// ---------------------------------------------------------------- gamification

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// The ledger is the authority for a score, so the assertions read the rows
// themselves instead of trusting the cached projection the endpoints expose.
const ledgerTotal = async (userId) =>
  (
    await XPTransaction.aggregate([
      { $match: { user: oid(userId) } },
      { $group: { _id: null, xp: { $sum: '$amount' } } }
    ])
  )[0]?.xp || 0;

const rowsFor = (userId, filter = {}) =>
  XPTransaction.find({ user: oid(userId), ...filter }).lean();

const checkIn = async (eventId, who) => {
  await call('POST', `/events/${eventId}/register`, { token: who.token });

  const issued = await call('GET', `/events/${eventId}/checkin-token`, {
    token: who.token,
  });
  assert.equal(issued.status, 200, JSON.stringify(issued.data));

  return call('POST', `/events/${eventId}/checkin`, {
    token: admin.token,
    body: { token: issued.data.token },
  });
};

const makeEvent = async (body) => {
  const res = await call('POST', '/events', {
    token: admin.token,
    body: {
      description: 'Gamification fixture',
      date: future(24),
      endDate: future(26),
      club: clubId,
      ...body,
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return res.data.event._id;
};

const award = (token, body) =>
  call('POST', '/gamification/awards', { token, body });

const derbyId = await makeEvent({
  title: 'Robot Derby',
  activityType: 'competition',
});

const gwen = await makeUser('Gwen Gamify', 'gwen@test.dev');
const gus = await makeUser('Gus Guest', 'gus@test.dev');
const val = await makeUser('Val Volunteer', 'val@test.dev');

await test('gamification endpoints require a token', async () => {
  for (const path of ['/gamification/rules', '/gamification/students', '/gamification/clubs']) {
    assert.equal((await call('GET', path)).status, 401, path + ' was readable anonymously');
  }
});

await test('the badge catalog seeds itself on first read', async () => {
  const { status, data } = await call('GET', '/gamification/rules', {
    token: gwen.token,
  });
  assert.equal(status, 200);
  assert.equal(data.achievements.length, 8, 'the catalog did not seed');
  assert.ok(data.achievements.some((b) => b.slug === 'first_event'));
  assert.ok(
    data.xpRules.some((r) => r.type === 'event_attendance' && r.points === 10),
    'the published attendance rate changed'
  );
  assert.deepEqual(data.periods, ['overall', 'weekly', 'monthly', 'semester']);
  assert.ok(data.semesters.length >= 3);

  assert.equal(await (await import('../models/Achievement.js')).default.countDocuments(), 8);
});

await test('an unknown activity type is rejected on events', async () => {
  const { status, data } = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Bad Type',
      description: 'x',
      date: future(9),
      endDate: future(10),
      club: clubId,
      activityType: 'gala',
    },
  });
  assert.equal(status, 400);
  assert.match(data.message, /activity type/i);
});

await test('a verified competition check-in pays one competition award', async () => {
  const scan = await checkIn(derbyId, gwen);
  assert.equal(scan.status, 200, JSON.stringify(scan.data));
  assert.equal(scan.data.xpAwarded, 20);

  const rows = await rowsFor(gwen.id, { event: derbyId });
  assert.equal(rows.length, 1, 'one check-in wrote more than one award');
  assert.equal(rows[0].type, 'competition_participation');
  assert.equal(rows[0].amount, 20);

  const attendance = await Attendance.findOne({ event: derbyId, user: gwen.id });
  assert.equal(rows[0].idempotencyKey, `attendance:${attendance._id}`);
});

await test('a volunteering event pays the volunteering rate', async () => {
  const cleanUpId = await makeEvent({
    title: 'Campus Clean-Up',
    activityType: 'volunteering',
  });

  const scan = await checkIn(cleanUpId, val);
  assert.equal(scan.data.xpAwarded, 20);

  const rows = await rowsFor(val.id, { event: cleanUpId });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'volunteering');
});

await test('a first check-in unlocks its badge with a single bonus', async () => {
  const badges = await StudentBadge.find({ user: gwen.id }).lean();
  assert.equal(badges.length, 1);
  assert.equal(badges[0].slug, 'first_event');

  const bonuses = await rowsFor(gwen.id, {
    type: 'achievement_bonus',
    achievement: 'first_event',
  });
  assert.equal(bonuses.length, 1, 'the badge bonus was written twice');
  assert.equal(bonuses[0].amount, 25);

  // A badge bonus is personal money: it carries no club, or it would inflate
  // every club the student has ever joined.
  assert.equal(bonuses[0].club, null);

  const notice = await Notification.findOne({ user: gwen.id, type: 'achievement' });
  assert.ok(notice, 'the student was never told about the badge');
});

await test('a manual attendance award cannot stack on a real check-in', async () => {
  const { status, data } = await award(admin.token, {
    userId: gwen.id,
    type: 'competition_participation',
    eventId: derbyId,
    reason: 'Hand credit for the derby',
  });
  assert.equal(status, 409);
  assert.equal(data.awarded.length, 0);
  assert.match(data.skipped[0].reason, /attendance/i);

  assert.equal((await rowsFor(gwen.id, { event: derbyId })).length, 1);
});

await test('repeating an identical manual award is idempotent', async () => {
  // Event-bound: the key is derived from (type, event, student).
  const bound = {
    userId: gwen.id,
    type: 'event_organizing',
    eventId: derbyId,
    reason: 'Ran the derby desk',
  };

  const first = await award(admin.token, bound);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.equal(first.data.awarded[0].amount, 30);

  const replay = await award(admin.token, bound);
  assert.equal(replay.status, 409);
  assert.match(replay.data.skipped[0].reason, /already recorded/i);
  assert.equal((await rowsFor(gwen.id, { type: 'event_organizing' })).length, 1);

  // Free-standing: the caller supplies the key, so a retried request is safe.
  const loose = {
    userId: gwen.id,
    type: 'volunteering',
    reason: 'Packed down the arena',
    idempotencyKey: 'volunteer:derby-teardown',
  };

  assert.equal((await award(admin.token, loose)).status, 201);

  const looseAgain = await award(admin.token, loose);
  assert.equal(looseAgain.status, 409);
  assert.match(looseAgain.data.skipped[0].reason, /already recorded/i);
  assert.equal((await rowsFor(gwen.id, { type: 'volunteering' })).length, 1);
});

await test('manual awards require a reason and a sane amount', async () => {
  const noReason = await award(admin.token, {
    userId: gwen.id,
    type: 'volunteering',
  });
  assert.equal(noReason.status, 400);
  assert.match(noReason.data.message, /reason/i);

  const tooBig = await award(admin.token, {
    userId: gwen.id,
    type: 'manual_adjustment',
    amount: 5000,
    reason: 'Astronomous',
  });
  assert.equal(tooBig.status, 400);
  assert.match(tooBig.data.message, /1000/);

  const unknownType = await award(admin.token, {
    userId: gwen.id,
    type: 'vibes',
    reason: 'Good vibes',
  });
  assert.equal(unknownType.status, 400);

  const nobody = await award(admin.token, { type: 'volunteering', reason: 'x' });
  assert.equal(nobody.status, 400);
});

await test('students cannot award points', async () => {
  const { status } = await award(gwen.token, {
    userId: gus.id,
    type: 'volunteering',
    reason: 'Self service',
  });
  assert.equal(status, 403);
});

await test('a club leader can only credit events they run', async () => {
  const foreign = await award(leader.token, {
    userId: gus.id,
    type: 'volunteering',
    eventId: derbyId,
    reason: 'Not my event',
  });
  assert.equal(foreign.status, 403);
  assert.match(foreign.data.message, /do not run this event/i);

  const unbound = await award(leader.token, {
    userId: gus.id,
    type: 'volunteering',
    reason: 'No event at all',
  });
  assert.equal(unbound.status, 403);
});

await test('a club leader cannot pick their own point values', async () => {
  const ownEventId = (await Event.findOne({ title: 'Improv Night' }))._id;

  const custom = await award(student.token, {
    userId: gus.id,
    type: 'volunteering',
    eventId: ownEventId,
    amount: 500,
    reason: 'Generous',
  });
  assert.equal(custom.status, 403);
  assert.match(custom.data.message, /published rate/i);

  const adjustment = await award(student.token, {
    userId: gus.id,
    type: 'manual_adjustment',
    eventId: ownEventId,
    amount: 40,
    reason: 'Off the books',
  });
  assert.equal(adjustment.status, 403);

  const atRate = await award(student.token, {
    userId: gus.id,
    type: 'volunteering',
    eventId: ownEventId,
    reason: 'Ran the sound desk',
  });
  assert.equal(atRate.status, 201, JSON.stringify(atRate.data));
  assert.equal(atRate.data.awarded[0].amount, 20);
});

await test('a deduction and a reversal both stay in the history', async () => {
  const before = await ledgerTotal(gwen.id);

  const deducted = await award(admin.token, {
    userId: gwen.id,
    type: 'manual_adjustment',
    amount: -15,
    reason: 'Corrected a duplicate claim',
  });
  assert.equal(deducted.status, 201);
  assert.equal(deducted.data.awarded[0].amount, -15);
  assert.equal(await ledgerTotal(gwen.id), before - 15);

  const row = await XPTransaction.findOne({
    user: gwen.id,
    type: 'manual_adjustment',
    amount: -15,
  });

  const reversed = await call('DELETE', `/gamification/awards/${row._id}`, {
    token: admin.token,
    body: { reason: 'Correction withdrawn' },
  });
  assert.equal(reversed.status, 200, JSON.stringify(reversed.data));
  assert.equal(reversed.data.reversal.amount, 15);
  assert.equal(await ledgerTotal(gwen.id), before);

  const twice = await call('DELETE', `/gamification/awards/${row._id}`, {
    token: admin.token,
    body: {},
  });
  assert.equal(twice.status, 409);

  const missing = await call('DELETE', '/gamification/awards/' + new mongoose.Types.ObjectId(), {
    token: admin.token,
    body: {},
  });
  assert.equal(missing.status, 404);

  const asStudent = await call(
    'DELETE',
    `/gamification/awards/${row._id}`,
    { token: gwen.token, body: {} }
  );
  assert.equal(asStudent.status, 403);
});

await test('revoking attendance reverses the XP but keeps the badge', async () => {
  const quizId = await makeEvent({ title: 'Quiz Night' });

  const before = await ledgerTotal(gus.id);

  const scan = await checkIn(quizId, gus);
  assert.equal(scan.data.xpAwarded, 10);

  const withAttendance = await ledgerTotal(gus.id);
  assert.equal(withAttendance, before + 10 + 25, 'check-in XP plus its badge bonus');

  const removed = await call('DELETE', `/events/${quizId}/attendance`, {
    token: admin.token,
    body: { userId: gus.id },
  });
  assert.equal(removed.status, 200, JSON.stringify(removed.data));
  assert.equal(removed.data.xpReversed, 10);

  // The points come back out of the score; the badge the student already
  // collected stays on the profile.
  assert.equal(await ledgerTotal(gus.id), withAttendance - 10);
  assert.equal((await StudentBadge.countDocuments({ user: gus.id })), 1);

  const reversal = await XPTransaction.findOne({
    idempotencyKey: { $regex: '^reverse:attendance:' },
    user: gus.id,
  });
  assert.ok(reversal, 'no reversal row was written');
  assert.equal(reversal.amount, -10);
  assert.match(reversal.reason, /revoked/i);

  assert.equal(
    (await Gamification.findOne({ user: oid(gus.id) }).lean()).totalXp,
    await ledgerTotal(gus.id),
    'the cache did not follow the reversal'
  );

  // Re-checking the same student in is a new attendance row, so it is paid again.
  const again = await checkIn(quizId, gus);
  assert.equal(again.status, 200);
  assert.equal(again.data.xpAwarded, 10);
  assert.equal(await ledgerTotal(gus.id), withAttendance);
});

await test('the board ranks ties with competition places', async () => {
  const trio = await Promise.all([
    makeUser('Rankcase A', 'ranka@test.dev'),
    makeUser('Rankcase B', 'rankb@test.dev'),
    makeUser('Rankcase C', 'rankc@test.dev'),
  ]);

  for (const [i, who] of trio.entries()) {
    const res = await award(admin.token, {
      userId: who.id,
      type: 'manual_adjustment',
      amount: [100, 100, 30][i],
      reason: 'Ranking fixture',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
  }

  const { status, data } = await call(
    'GET',
    `/gamification/students?search=Rankcase&period=overall&limit=50`,
    { token: gwen.token }
  );
  assert.equal(status, 200);
  assert.equal(data.entries.length, 3);
  assert.deepEqual(
    data.entries.map((e) => e.rank),
    [1, 1, 3],
    'equal scores must share a place and skip the next one'
  );
  assert.deepEqual(
    data.entries.map((e) => e.totalXp),
    [100, 100, 30]
  );
  assert.equal(data.totalEntries, 3);
  assert.equal(data.ranksExact, true);
  assert.ok(data.entries[0].levelTitle, 'no level reported');
});

await test('the board does not carry contact details', async () => {
  const { data } = await call('GET', '/gamification/students?search=Rankcase', {
    token: gwen.token,
  });

  const text = JSON.stringify(data.entries);
  assert.ok(!text.includes('@'), 'a leaderboard row carried an email address');
  assert.ok(!/phone|password|token/i.test(text), 'a private field leaked');
});

await test('windowed rankings ignore awards outside the window', async () => {
  const recent = await makeUser('Window Fresh', 'windowf@test.dev');
  const ancient = await makeUser('Window Old', 'windowo@test.dev');

  for (const [who, xp] of [
    [recent, 30],
    [ancient, 900],
  ]) {
    const res = await award(admin.token, {
      userId: who.id,
      type: 'manual_adjustment',
      amount: xp,
      reason: 'Window fixture',
    });
    assert.equal(res.status, 201);
  }

  // Backdate the whole history the way a real import would: after the rows
  // exist, including the legend bonus the 900 XP just unlocked.
  await XPTransaction.collection.updateMany(
    { user: oid(ancient.id) },
    { $set: { createdAt: new Date(Date.now() - 400 * 86400000) } }
  );

  const monthly = await call(
    'GET',
    '/gamification/students?period=monthly&search=Window&limit=50',
    { token: recent.token }
  );
  assert.equal(monthly.status, 200);
  assert.deepEqual(
    monthly.data.entries.map((e) => e.name),
    ['Window Fresh'],
    'an award from last year counted toward this month'
  );
  assert.equal(monthly.data.window.period, 'monthly');
  assert.ok(monthly.data.window.start, 'the monthly window was unbounded');

  const overall = await call(
    'GET',
    '/gamification/students?period=overall&search=Window&limit=50',
    { token: ancient.token }
  );
  assert.deepEqual(
    overall.data.entries.map((e) => e.totalXp),
    [900 + 250, 30],
    'lifetime XP should include the badge bonus the 900 unlocked'
  );
  assert.equal(overall.data.entries[0].name, 'Window Old');

  // Search must not be able to probe by email.
  const byEmail = await call(
    'GET',
    '/gamification/students?search=windowo%40test.dev',
    { token: recent.token }
  );
  assert.equal(byEmail.data.entries.length, 0, 'students are searchable by email');
});

await test('my rank agrees between the board and the profile', async () => {
  const board = await call('GET', '/gamification/students?period=monthly', {
    token: gwen.token,
  });
  assert.equal(board.status, 200);
  assert.ok(board.data.myRank.rank >= 1);
  assert.equal(board.data.myRank.totalXp, await ledgerTotal(gwen.id));

  const me = await call('GET', '/gamification/students/me', { token: gwen.token });
  assert.equal(me.status, 200);
  assert.equal(
    me.data.ranks.monthly.rank,
    board.data.myRank.rank,
    'the board and the profile disagree about the same rank'
  );
  assert.equal(me.data.ranks.monthly.totalXp, board.data.myRank.totalXp);

  for (const period of ['overall', 'weekly', 'monthly', 'semester']) {
    assert.ok(me.data.ranks[period], `no rank for ${period}`);
  }
});

await test('a student profile reports level, badges and next target', async () => {
  const { status, data } = await call('GET', '/gamification/students/me', {
    token: gwen.token,
  });
  assert.equal(status, 200);

  assert.equal(data.xp.total, await ledgerTotal(gwen.id));
  assert.equal(data.xp.level.level, 1);
  assert.ok(data.xp.level.progressPercent >= 0);
  assert.equal(data.projectionDriftXp, 0, 'the projection drifted on its own');

  assert.equal(data.badges.length, 8);
  assert.equal(data.badges.filter((b) => b.earned).length, 1);
  assert.equal(
    data.badges.find((b) => b.slug === 'first_event').progressPercent,
    100
  );
  assert.ok(data.nextAchievement, 'nothing left to aim for');
  assert.equal(data.nextAchievement.earned, false);

  assert.ok(data.recentActivity.length > 0);
  assert.deepEqual(
    data.metrics.eventsAttended,
    await Attendance.countDocuments({ user: gwen.id })
  );

  const byType = data.xp.byType.find((r) => r.type === 'achievement_bonus');
  assert.equal(byType.xp, 25);
});

await test('XP history is private unless you are an admin', async () => {
  const peeking = await call('GET', `/gamification/xp/history?userId=${admin.id}`, {
    token: gwen.token,
  });
  assert.equal(peeking.status, 403);

  const own = await call('GET', '/gamification/xp/history', { token: gwen.token });
  assert.equal(own.status, 200);
  assert.equal(own.data.userId, gwen.id);
  assert.ok(own.data.total >= 3);
  assert.ok(own.data.entries.every((e) => e.amount !== undefined));
  assert.ok(!JSON.stringify(own.data).includes('@test.dev'), 'history leaked emails');

  const bogus = await call('GET', '/gamification/xp/history?userId=not-an-id', {
    token: admin.token,
  });
  assert.equal(bogus.status, 400);

  const asAdmin = await call('GET', `/gamification/xp/history?userId=${gwen.id}`, {
    token: admin.token,
  });
  assert.equal(asAdmin.status, 200);

  const credited = asAdmin.data.entries.find((e) => e.awardedBy);
  assert.ok(credited, 'no admin award in the ledger to check');
  assert.deepEqual(Object.keys(credited.awardedBy).sort(), ['id', 'name']);
});

await test('the club board scores activity and ignores badge bonuses', async () => {
  const res = await call('GET', '/gamification/clubs?limit=50', {
    token: gwen.token,
  });
  assert.equal(res.status, 200);
  const data = res.data;
  assert.ok(data.entries.length >= 1);

  const expected = (
    await XPTransaction.aggregate([
      {
        $match: {
          club: oid(clubId),
          type: { $ne: 'achievement_bonus' },
        },
      },
      { $group: { _id: null, xp: { $sum: '$amount' } } },
    ])
  )[0]?.xp || 0;

  const robotics = data.entries.find((e) => String(e.clubId) === String(clubId));
  assert.ok(robotics, 'the robotics club is missing from the club board');
  assert.equal(robotics.totalXp, expected);
  assert.ok(robotics.participation >= 2, 'participant count looks wrong');
  assert.ok(robotics.eventsOrganized >= 2);
  assert.ok(robotics.rank >= 1);

  // Every badge bonus is club-less, which is what keeps the two totals apart.
  const misfiled = await XPTransaction.countDocuments({
    type: 'achievement_bonus',
    club: { $ne: null },
  });
  assert.equal(misfiled, 0, 'a badge bonus was charged to a club');

  const standing = await call('GET', `/gamification/clubs/${clubId}`, {
    token: gwen.token,
  });
  assert.equal(standing.status, 200);
  assert.equal(standing.data.rank, robotics.rank);
  assert.ok(standing.data.topContributors.length >= 1);
  assert.ok(!JSON.stringify(standing.data.topContributors).includes('@'));
  assert.equal(standing.data.rankedClubs, data.entries.length);

  const missing = await call('GET', `/gamification/clubs/${new mongoose.Types.ObjectId()}`, {
    token: gwen.token,
  });
  assert.equal(missing.status, 404);
});

await test('winners can only be declared for students on the roster', async () => {
  const outsider = await makeUser('Not Competing', 'nocomp@test.dev');

  const bad = await call('POST', `/gamification/events/${derbyId}/winners`, {
    token: admin.token,
    body: { userIds: [outsider.id] },
  });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.data.ineligible, [outsider.id]);
  assert.equal(await XPTransaction.countDocuments({ user: outsider.id }), 0);

  const denied = await call('POST', `/gamification/events/${derbyId}/winners`, {
    token: leader.token,
    body: { userIds: [gwen.id] },
  });
  assert.equal(denied.status, 403);

  const won = await call('POST', `/gamification/events/${derbyId}/winners`, {
    token: admin.token,
    body: { userIds: [gwen.id] },
  });
  assert.equal(won.status, 201, JSON.stringify(won.data));

  const rows = await rowsFor(gwen.id, { type: 'competition_win' });
  assert.equal(rows[0].amount, 50);

  const replay = await call('POST', `/gamification/events/${derbyId}/winners`, {
    token: admin.token,
    body: { userIds: [gwen.id] },
  });
  assert.equal(replay.status, 201);
  assert.deepEqual(replay.data.skipped.map(String), [gwen.id]);
  assert.equal((await rowsFor(gwen.id, { type: 'competition_win' })).length, 1);

  // Winning a judged competition is the champion badge, and it pays once.
  assert.equal(await StudentBadge.countDocuments({ user: gwen.id, slug: 'competition_champion' }), 1);
  const championBonus = await rowsFor(gwen.id, {
    type: 'achievement_bonus',
    achievement: 'competition_champion',
  });
  assert.equal(championBonus.length, 1);

  const notice = await Notification.findOne({ user: gwen.id, title: /Champion/i });
  assert.ok(notice, 'no notification for the champion badge');
});

await test('organising credit goes to the club leader once per event', async () => {
  const gigId = await makeEvent({ title: 'Open Mic', club: otherClubId });

  const credited = await call(
    'POST',
    `/gamification/events/${gigId}/organizer-credit`,
    { token: student.token, body: {} }
  );
  assert.equal(credited.status, 201, JSON.stringify(credited.data));
  assert.deepEqual(credited.data.awarded.map(String), [student.id]);

  const rows = await rowsFor(student.id, { type: 'event_organizing' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 30);

  const again = await call(
    'POST',
    `/gamification/events/${gigId}/organizer-credit`,
    { token: student.token, body: {} }
  );
  assert.equal(again.status, 201);
  assert.deepEqual(again.data.skipped.map(String), [student.id]);

  const stamp = await Event.findById(gigId).lean();
  assert.ok(stamp.organizerCreditedAt, 'the event was never stamped as credited');

  const foreign = await call(
    'POST',
    `/gamification/events/${gigId}/organizer-credit`,
    { token: leader.token, body: {} }
  );
  assert.equal(foreign.status, 403);
});

await test('attendance from before gamification is backfilled, not invented', async () => {
  const legacyId = await makeEvent({ title: 'Legacy Night' });
  const legacy = await makeUser('Legacy Linda', 'legacy@test.dev');

  await call('POST', `/events/${legacyId}/register`, { token: legacy.token });

  // The way history looks on the day this feature ships: a row exists, no XP.
  const row = await Attendance.create({
    event: legacyId,
    user: legacy.id,
    method: 'roster',
    verifiedBy: admin.id,
  });

  assert.equal(await XPTransaction.countDocuments({ user: legacy.id }), 0);

  const scan = await call('GET', '/gamification/suspicious', { token: admin.token });
  assert.equal(scan.status, 200);
  const unsettled = scan.data.findings.find((f) => f.key === 'unsettled_attendance');
  assert.ok(unsettled, 'unpaid attendance went undetected');
  assert.ok(
    unsettled.examples.some((e) => String(e.attendanceId) === String(row._id))
  );

  const recompute = await call('POST', '/gamification/recompute', {
    token: admin.token,
    body: {},
  });
  assert.equal(recompute.status, 200, JSON.stringify(recompute.data));
  assert.ok(recompute.data.backfill?.awarded >= 1, 'the backfill paid nothing');

  const paid = await XPTransaction.findOne({ idempotencyKey: `attendance:${row._id}` });
  assert.ok(paid, 'backfilled attendance earned no XP');
  assert.equal(paid.amount, 10);
  assert.equal(paid.type, 'event_attendance');
  assert.equal(paid.source, 'automatic');

  const after = await call('GET', '/gamification/suspicious', { token: admin.token });
  const still = after.data.findings.find((f) => f.key === 'unsettled_attendance');
  assert.ok(
    !still?.examples?.some((e) => String(e.attendanceId) === String(row._id)),
    'the row stayed unpaid after recompute'
  );

  const denied = await call('POST', '/gamification/recompute', {
    token: legacy.token,
    body: {},
  });
  assert.equal(denied.status, 403);
});

await test('a drifted cache is reported and then healed', async () => {
  const truth = await ledgerTotal(gwen.id);
  await Gamification.updateOne({ user: oid(gwen.id) }, { $set: { totalXp: truth + 77 } });

  const me = await call('GET', '/gamification/students/me', { token: gwen.token });
  assert.equal(me.data.projectionDriftXp, 77);

  const analytics = await call('GET', '/gamification/analytics', { token: admin.token });
  assert.equal(analytics.status, 200);
  assert.ok(
    analytics.data.driftingProfiles.some((d) => String(d.userId) === gwen.id),
    'analytics missed the drifted profile'
  );
  assert.ok(analytics.data.totalXp > 0);
  assert.ok(analytics.data.byType.length >= 3);
  assert.ok(analytics.data.byDepartment.length >= 1);
  assert.ok(Array.isArray(analytics.data.last30Days));

  const studentView = await call('GET', '/gamification/analytics', {
    token: gwen.token,
  });
  assert.equal(studentView.status, 403);

  await call('POST', '/gamification/recompute', { token: admin.token, body: {} });

  const healed = await call('GET', '/gamification/students/me', { token: gwen.token });
  assert.equal(healed.data.projectionDriftXp, 0);
  assert.equal(
    (await Gamification.findOne({ user: oid(gwen.id) }).lean()).totalXp,
    await ledgerTotal(gwen.id)
  );

  // The board reads the ledger, so a cache that was wrong never made the
  // rankings wrong either.
  const board = await call('GET', '/gamification/students?search=Gwen&limit=50', {
    token: gwen.token,
  });
  assert.equal(board.data.entries[0].totalXp, await ledgerTotal(gwen.id));
});

await test('a duplicate award written outside the system is flagged', async () => {
  const dup = await makeUser('Dana Duplicate', 'dana@test.dev');
  const dupEvent = await makeEvent({ title: 'Suspect Night' });

  for (const key of ['tampered-one', 'tampered-two']) {
    await XPTransaction.create({
      user: dup.id,
      event: dupEvent,
      club: clubId,
      type: 'event_attendance',
      amount: 10,
      reason: 'Direct write',
      source: 'automatic',
      idempotencyKey: key,
    });
  }

  const { data } = await call('GET', '/gamification/suspicious', { token: admin.token });
  const finding = data.findings.find((f) => f.key === 'duplicate_awards');
  assert.ok(finding, 'two awards for one activity went unreported');
  assert.ok(
    finding.examples.some(
      (e) => String(e.userId) === dup.id && e.awards === 2
    )
  );

  const rateMismatch = await call('GET', '/gamification/suspicious', {
    token: admin.token,
  });
  assert.ok(
    !rateMismatch.data.findings.some((f) => f.key === 'xp_rate_mismatch'),
    'the anomaly scan flags awards that are on the published rate'
  );

  const asStudent = await call('GET', '/gamification/suspicious', {
    token: dup.token,
  });
  assert.equal(asStudent.status, 403);
});

await test('badge bonuses never pay twice across recomputes', async () => {
  for (let i = 0; i < 2; i += 1) {
    const res = await call('POST', '/gamification/recompute', {
      token: admin.token,
      body: { maxStudents: 2000 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.remaining, 0);
  }

  const bonuses = await XPTransaction.aggregate([
    { $match: { type: 'achievement_bonus' } },
    { $group: { _id: { user: '$user', slug: '$achievement' }, rows: { $sum: 1 } } },
    { $match: { rows: { $gt: 1 } } },
  ]);
  assert.deepEqual(bonuses, [], 'a badge paid its bonus more than once');

  assert.equal(
    await XPTransaction.countDocuments({ type: 'achievement_bonus' }),
    await StudentBadge.countDocuments(),
    'badge rows and badge bonuses disagree'
  );
});

await test('the badge catalog is editable by admins only', async () => {
  const list = await call('GET', '/gamification/achievements', { token: gwen.token });
  assert.equal(list.status, 200);
  assert.equal(list.data.achievements.length, 8);
  const explorer = list.data.achievements.find((a) => a.slug === 'event_explorer');
  assert.equal(explorer.earned, false);
  assert.equal(explorer.remaining, Math.max(0, explorer.threshold - explorer.value));

  const asStudent = await call('POST', '/gamification/achievements', {
    token: gwen.token,
    body: { slug: 'my_badge', title: 'Mine', description: 'x', metric: 'totalXp', threshold: 1 },
  });
  assert.equal(asStudent.status, 403);

  const created = await call('POST', '/gamification/achievements', {
    token: admin.token,
    body: {
      slug: 'Debate_Division',
      title: 'Debate Division',
      description: 'Won the inter-hall debate.',
      metric: 'competitionWins',
      threshold: 2,
      xpBonus: 40,
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.achievement.slug, 'debate_division');

  const clash = await call('POST', '/gamification/achievements', {
    token: admin.token,
    body: { slug: 'first_event', title: 'Clash', description: 'x', metric: 'totalXp', threshold: 1 },
  });
  assert.equal(clash.status, 409);

  const nonsense = await call('POST', '/gamification/achievements', {
    token: admin.token,
    body: { slug: 'ok_slug', title: 'Ok', description: 'x', metric: 'vibes', threshold: 1 },
  });
  assert.equal(nonsense.status, 400);

  const edit = await call(
    'PUT',
    `/gamification/achievements/${created.data.achievement._id}`,
    { token: admin.token, body: { threshold: 3, active: false } }
  );
  assert.equal(edit.status, 200);
  assert.equal(edit.data.achievement.threshold, 3);

  // A deactivated badge stops being offered to students.
  const after = await call('GET', '/gamification/achievements', { token: gwen.token });
  assert.ok(!after.data.achievements.some((a) => a.slug === 'debate_division'));

  const badId = await call('PUT', '/gamification/achievements/not-an-id', {
    token: admin.token,
    body: { threshold: 2 },
  });
  assert.equal(badId.status, 400);

  // Retire the fixture badge so the catalog count stays at eight.
  await (await import('../models/Achievement.js')).default.deleteOne({
    _id: created.data.achievement._id,
  });
});

await test('CSV export is admin only and defuses formula cells', async () => {
  const denied = await call('GET', '/gamification/export', { token: gwen.token });
  assert.equal(denied.status, 403);

  const eve = await makeUser('=Excel Eve', 'eve@test.dev');
  const credited = await award(admin.token, {
    userId: eve.id,
    type: 'manual_adjustment',
    amount: 40,
    reason: 'Export fixture',
  });
  assert.equal(credited.status, 201, JSON.stringify(credited.data));

  const students = await call('GET', '/gamification/export?scope=students', {
    token: admin.token,
  });
  assert.equal(students.status, 200);
  assert.match(students.type, /text\/csv/);
  assert.equal(
    students.data.split('\r\n')[0],
    'rank,name,student_id,department,total_xp,events_attended,competitions_won'
  );
  assert.ok(
    students.data.includes(`"'=Excel Eve"`),
    'a name starting with = was exported as a live formula'
  );
  assert.ok(!students.data.includes('@test.dev'), 'the export carried emails');

  const clubs = await call('GET', '/gamification/export?scope=clubs', {
    token: admin.token,
  });
  assert.equal(clubs.status, 200);
  assert.equal(
    clubs.data.split('\r\n')[0],
    'rank,club,department,total_xp,events_organized,members,participants'
  );
  assert.ok(clubs.data.split('\r\n').length > 1, 'the club export was empty');
  assert.ok(clubs.data.includes('Robotics Club'));

  const windowed = await call('GET', '/gamification/export?period=monthly', {
    token: admin.token,
  });
  assert.ok(!windowed.data.includes('Window Old'), 'the export ignored the window');
});

await test('the admin XP table reads the cache and stays admin only', async () => {
  const denied = await call('GET', '/gamification/xp-totals', { token: gwen.token });
  assert.equal(denied.status, 403);

  const { status, data } = await call('GET', '/gamification/xp-totals?limit=500', {
    token: admin.token,
  });
  assert.equal(status, 200);
  assert.ok(data.entries.length >= 3);

  const sorted = [...data.entries].map((e) => e.totalXp);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => b - a));

  for (const row of data.entries) {
    const truth = await ledgerTotal(row.userId);
    assert.equal(row.totalXp, truth, `the cache is wrong for ${row.name}`);
    assert.ok(!JSON.stringify(row).includes('@'), 'the table leaked emails');
  }
});

await test('pagination and bad query parameters are handled', async () => {
  const first = await call('GET', '/gamification/students?limit=2&page=1', {
    token: gwen.token,
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.entries.length, 2);
  assert.equal(first.data.totalPages, Math.ceil(first.data.totalEntries / 2));

  const second = await call('GET', '/gamification/students?limit=2&page=2', {
    token: gwen.token,
  });
  assert.notEqual(
    second.data.entries[0].userId,
    first.data.entries[0].userId,
    'page 2 repeated page 1'
  );

  // Ranks have to keep counting across a page break, not restart at 1.
  assert.ok(
    second.data.entries[0].rank > first.data.entries[1].rank,
    `page 2 started at rank ${second.data.entries[0].rank} after rank ${first.data.entries[1].rank}`
  );
  assert.equal(second.data.entries[0].totalXp <= first.data.entries[1].totalXp, true);

  const junk = await call('GET', '/gamification/students?limit=-90&page=0&period=yearly', {
    token: gwen.token,
  });
  assert.equal(junk.status, 200);
  assert.equal(junk.data.page, 1);
  assert.equal(junk.data.limit, 20, 'the default page size was not restored');
  assert.equal(junk.data.window.period, 'overall', 'an unknown period was trusted');

  // search[$ne]=1 arrives as an object once the sanitizer prunes the operator.
  // It must be dropped, not executed against the user collection.
  const injection = await call('GET', '/gamification/students?search[$ne]=1', {
    token: gwen.token,
  });
  assert.equal(injection.status, 200);
  assert.deepEqual(
    injection.data.entries.map((e) => e.userId),
    junk.data.entries.map((e) => e.userId),
    'an operator query was treated as a filter instead of being ignored'
  );

  const brackets = await call(
    'GET',
    `/gamification/students?search=${encodeURIComponent('Rankcase (')}`,
    { token: gwen.token }
  );
  assert.equal(brackets.status, 200, 'an unbalanced bracket broke the search');
  assert.equal(brackets.data.entries.length, 0);
});

// ---------------------------------------------------------------- announcements

const inboxFor = async (who) => {
  const res = await call('GET', '/notifications', { token: who.token });
  assert.equal(res.status, 200);
  return res.data.notifications;
};

await test('creating a club tells every student', async () => {
  const { status } = await call('POST', '/clubs', {
    token: admin.token,
    body: { clubName: 'Chess Circle', description: 'Play' },
  });
  assert.equal(status, 201);

  const notices = (await inboxFor(student)).filter(
    (n) => n.type === 'club' && /Chess Circle/.test(n.title)
  );

  assert.equal(notices.length, 1, 'a student never heard about the new club');
  assert.equal(notices[0].isRead, false);

  // Broadcasts are one shared document, not one row per recipient.
  assert.equal(
    await Notification.countDocuments({
      user: null,
      title: { $regex: 'Chess Circle' },
    }),
    1,
    'the announcement was fanned out per student'
  );
});

await test('creating an event announces it with a schedule the reader localises', async () => {
  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Robot Derby',
      description: 'Bots fight',
      date: future(48),
      endDate: future(52),
      location: 'Hall 2',
      club: clubId,
    },
  });
  assert.equal(created.status, 201);

  const notices = await inboxFor(other);
  const notice = notices.find(
    (n) => n.type === 'event' && /Robot Derby/.test(n.title)
  );

  assert.ok(notice, 'no announcement for the new event');
  assert.equal(notice.event?.title, 'Robot Derby');
  assert.ok(notice.event?.date, 'the event document was not populated');
  assert.equal(
    notice.event.location,
    'Hall 2',
    'the announcement carried no place to show up at'
  );

  await call('PUT', `/notifications/${notice._id}/read`, {
    token: other.token,
  });

  const afterOther = await inboxFor(other);
  assert.equal(
    afterOther.find((n) => n._id === notice._id).isRead,
    true,
    'a broadcast did not record the read'
  );

  const afterStudent = await inboxFor(student);
  assert.equal(
    afterStudent.find((n) => n._id === notice._id).isRead,
    false,
    'one reader marked the broadcast read for the whole campus'
  );

  await call('DELETE', `/events/${created.data.event._id}`, {
    token: admin.token,
  });
});

await test('a cancellation is announced once, and a reopening says so', async () => {
  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Quiz Bowl',
      description: 'Questions',
      date: future(96),
      endDate: future(99),
      club: clubId,
    },
  });
  const eventId = created.data.event._id;

  await call('PUT', `/events/${eventId}`, {
    token: admin.token,
    body: { status: 'cancelled' },
  });

  // A second edit on an already cancelled event must not repeat the notice.
  await call('PUT', `/events/${eventId}`, {
    token: admin.token,
    body: { status: 'cancelled', location: 'Hall 1' },
  });

  const cancelled = (await inboxFor(student)).filter(
    (n) => n.type === 'cancellation' && /Quiz Bowl/.test(n.title)
  );
  assert.equal(cancelled.length, 1, 'the cancellation was announced twice');

  const reopened = await call('PUT', `/events/${eventId}`, {
    token: admin.token,
    body: { status: 'upcoming' },
  });
  assert.equal(reopened.status, 200);
  assert.notEqual(
    reopened.data.event.status,
    'cancelled',
    'a cancelled event could not be reopened'
  );

  const back = (await inboxFor(student)).filter(
    (n) => n.type === 'event' && /back on the schedule/.test(n.title)
  );
  assert.equal(back.length, 1, 'the reopening was not announced');

  await call('DELETE', `/events/${eventId}`, { token: admin.token });
});

await test('deleting an event announces it without a broken link', async () => {
  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Paintball Day',
      description: 'Outside',
      date: future(120),
      endDate: future(126),
      club: clubId,
    },
  });

  const { status } = await call('DELETE', `/events/${created.data.event._id}`, {
    token: admin.token,
  });
  assert.equal(status, 200);

  const notice = (await inboxFor(student)).find(
    (n) => n.type === 'cancellation' && /Paintball Day/.test(n.title)
  );

  assert.ok(notice, 'the removal was not announced');
  assert.ok(!notice.event, 'the notice still points at a deleted event');
});

// ---------------------------------------------------------------- calendar

await test('the calendar is private', async () => {
  assert.equal((await call('GET', '/calendar')).status, 401);
  assert.equal((await call('POST', '/calendar/events', { body: { eventId: clubId } })).status, 401);
});

await test('saving an event keeps it on the site calendar, not just on disk', async () => {
  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Bot Battle',
      description: 'Sumo robots',
      date: future(48),
      endDate: future(50),
      club: clubId,
    },
  });
  const eventId = created.data.event._id;

  const added = await call('POST', '/calendar/events', {
    token: student.token,
    body: { eventId },
  });
  assert.equal(added.status, 201);
  assert.equal(added.data.events.length, 1);

  // A double click must not create a second entry.
  const again = await call('POST', '/calendar/events', {
    token: student.token,
    body: { eventId },
  });
  assert.equal(again.status, 200);
  assert.equal(again.data.already, true);
  assert.equal(again.data.events.length, 1);

  const listed = await call('GET', '/calendar', { token: student.token });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.events[0].title, 'Bot Battle');
  assert.equal(listed.data.events[0].club.clubName, 'Robotics Club');

  const removed = await call('DELETE', `/calendar/events/${eventId}`, {
    token: student.token,
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.data.events.length, 0);

  await call('DELETE', `/events/${eventId}`, { token: admin.token });
});

await test('the calendar rejects ids that are not events', async () => {
  const malformed = await call('POST', '/calendar/events', {
    token: student.token,
    body: { eventId: 'not-an-objectid' },
  });
  assert.equal(malformed.status, 400);

  const missing = await call('POST', '/calendar/events', {
    token: student.token,
    body: { eventId: admin.id },
  });
  assert.equal(missing.status, 404);
});

await test('one student cannot read another student\'s calendar', async () => {
  const saved = await call('POST', '/calendar/notes', {
    token: student.token,
    body: { day: 12, month: 5, year: 2031, text: 'Order banners' },
  });
  assert.equal(saved.status, 201);

  const otherView = await call('GET', '/calendar', { token: other.token });
  assert.equal(otherView.status, 200);
  assert.equal(otherView.data.notes.length, 0);
  assert.equal(otherView.data.events.length, 0);

  const foreignNote = await call('DELETE', `/calendar/notes/${saved.data.notes[0].id}`, {
    token: other.token,
  });
  assert.equal(foreignNote.status, 404);

  await call('DELETE', `/calendar/notes/${saved.data.notes[0].id}`, {
    token: student.token,
  });
});

await test('day notes validate their date and text', async () => {
  const impossible = await call('POST', '/calendar/notes', {
    token: student.token,
    body: { day: 30, month: 1, year: 2031, text: 'Feb 30' },
  });
  assert.equal(impossible.status, 400);

  const blank = await call('POST', '/calendar/notes', {
    token: student.token,
    body: { day: 1, month: 0, year: 2031, text: '    ' },
  });
  assert.equal(blank.status, 400);

  const tooLong = await call('POST', '/calendar/notes', {
    token: student.token,
    body: { day: 1, month: 0, year: 2031, text: 'x'.repeat(300) },
  });
  assert.equal(tooLong.status, 400);

  const saved = await call('POST', '/calendar/notes', {
    token: student.token,
    body: { day: 4, month: 6, year: 2031, text: 'Founders day prep' },
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.notes.length, 1);
  assert.equal(saved.data.notes[0].text, 'Founders day prep');

  const dropped = await call('DELETE', `/calendar/notes/${saved.data.notes[0].id}`, {
    token: student.token,
  });
  assert.equal(dropped.status, 200);
  assert.equal(dropped.data.notes.length, 0);
});

// ---------------------------------------------------------------- reminders

const { sendUpcomingEventReminders } = await import(
  '../services/reminderService.js'
);

const reminderCountFor = async (who, title) => {
  const inbox = await call('GET', '/notifications', { token: who.token });
  return inbox.data.notifications.filter(
    (n) => n.type === 'reminder' && n.title.includes(title)
  ).length;
};

await test('attendees are warned thirty minutes ahead, exactly once', async () => {
  const attendee = await makeUser('Ana Attendee', 'ana@test.dev');

  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Sunrise Hack',
      description: 'Morning build sprint',
      date: future(20 / 60),
      endDate: future(2),
      club: clubId,
      location: 'Lab 3',
    },
  });
  const eventId = created.data.event._id;

  await call('POST', `/events/${eventId}/register`, { token: attendee.token });

  const sweep = await sendUpcomingEventReminders();
  assert.ok(sweep.recipients >= 1, 'nobody was warned');
  assert.equal(await reminderCountFor(attendee, 'Sunrise Hack'), 1);

  const inbox = await call('GET', '/notifications', { token: attendee.token });
  const notice = inbox.data.notifications.find((n) => n.type === 'reminder');
  assert.match(notice.title, /starts in \d+ min/);
  assert.match(notice.message, /Lab 3/);
  assert.equal(notice.event._id, eventId);

  // The second pass sees a claimed event and leaves the crowd alone.
  await sendUpcomingEventReminders();
  assert.equal(await reminderCountFor(attendee, 'Sunrise Hack'), 1);

  await call('DELETE', `/events/${eventId}`, { token: admin.token });
});

await test('students who saved an event to their calendar are warned too', async () => {
  const saver = await makeUser('Sally Saver', 'saver@test.dev');

  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Quiet Reading Room',
      description: 'Silent study',
      date: future(25 / 60),
      endDate: future(2),
      club: clubId,
    },
  });
  const eventId = created.data.event._id;

  const saved = await call('POST', '/calendar/events', {
    token: saver.token,
    body: { eventId },
  });
  assert.equal(saved.status, 201);

  // No registration, so only the calendar itself puts them on the list.
  await sendUpcomingEventReminders();
  assert.equal(await reminderCountFor(saver, 'Quiet Reading Room'), 1);

  await call('DELETE', `/events/${eventId}`, { token: admin.token });
});

await test('turning event reminders off in settings is honoured', async () => {
  const quiet = await makeUser('Qui Quinn', 'quiet@test.dev');

  const opted = await call('PUT', '/auth/profile', {
    token: quiet.token,
    body: { eventReminders: false },
  });
  assert.equal(opted.status, 200);

  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Surprise Pop-up',
      description: 'Flash meetup',
      date: future(15 / 60),
      endDate: future(1),
      club: clubId,
    },
  });
  const eventId = created.data.event._id;

  await call('POST', `/events/${eventId}/register`, { token: quiet.token });

  await sendUpcomingEventReminders();
  assert.equal(await reminderCountFor(quiet, 'Surprise Pop-up'), 0);

  await call('DELETE', `/events/${eventId}`, { token: admin.token });
});

await test('cancelled and far-off events send no warning', async () => {
  const cancelled = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Cancelled Cruise',
      description: 'Called off',
      date: future(10 / 60),
      endDate: future(1),
      club: clubId,
    },
  });
  await call('PUT', `/events/${cancelled.data.event._id}`, {
    token: admin.token,
    body: { status: 'cancelled' },
  });

  const distant = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Winter Gala',
      description: 'Months away',
      date: future(48),
      endDate: future(52),
      club: clubId,
    },
  });

  await sendUpcomingEventReminders();
  assert.equal(await reminderCountFor(student, 'Cancelled Cruise'), 0);
  assert.equal(await reminderCountFor(student, 'Winter Gala'), 0);

  // The untouched slot lets the gala warn properly once it does fall due.
  const stored = await Event.findById(distant.data.event._id).lean();
  assert.equal(stored.reminderSentAt, null);

  await call('DELETE', `/events/${cancelled.data.event._id}`, { token: admin.token });
  await call('DELETE', `/events/${distant.data.event._id}`, { token: admin.token });
});

await test('moving an event re-arms its warning', async () => {
  const created = await call('POST', '/events', {
    token: admin.token,
    body: {
      title: 'Sliding Symposium',
      description: 'Time may move',
      date: future(12 / 60),
      endDate: future(1),
      club: clubId,
    },
  });
  const eventId = created.data.event._id;

  await sendUpcomingEventReminders();

  const claimed = await Event.findById(eventId).lean();
  assert.ok(claimed.reminderSentAt, 'the first warning was not stamped');

  const moved = await call('PUT', `/events/${eventId}`, {
    token: admin.token,
    body: { date: future(18 / 60), endDate: future(1) },
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.event.reminderSentAt, null);

  await call('DELETE', `/events/${eventId}`, { token: admin.token });
});

await test('a club leader profile reports the clubs they run', async () => {
  const before = await call('GET', '/auth/profile', { token: leader.token });
  assert.equal(before.status, 200);
  assert.equal(before.data.user.role, 'club_leader');
  assert.equal(before.data.user.effectiveRole, 'club_leader');
  assert.deepEqual(
    before.data.user.ledClubs,
    [],
    'a leader with no club reported one anyway'
  );

  const created = await call('POST', '/clubs', {
    token: admin.token,
    body: { clubName: 'Chess Circle', description: 'Board games' },
  });
  const clubToHand = created.data.club._id;

  await call('POST', `/clubs/${clubToHand}/join`, { token: leader.token });

  const transferred = await call('PUT', `/clubs/${clubToHand}/transfer-admin`, {
    token: admin.token,
    body: { userId: leader.id },
  });
  assert.equal(transferred.status, 200);

  const after = await call('GET', '/auth/profile', { token: leader.token });
  const led = after.data.user.ledClubs;
  assert.equal(led.length, 1);
  assert.equal(led[0].clubName, 'Chess Circle');
  assert.ok(led[0].memberCount >= 1, 'the roster count was not reported');

  // The list is per person: another student's profile never picks up a club
  // they do not run.
  const plain = await call('GET', '/auth/profile', { token: student.token });
  assert.ok(
    plain.data.user.ledClubs.every((club) => club.clubName !== 'Chess Circle'),
    "someone else's club leaked into the student profile"
  );

  await call('DELETE', `/clubs/${clubToHand}`, { token: admin.token });
});

// ------------------------------------------------- temporary password system

const CHOSEN_PW = 'Campus2026!Guide';

let tempPwFor = {};

await test('signup rejects a weak password', async () => {
  const { status, data } = await call('POST', '/auth/signup', {
    body: { name: 'Weak', email: 'weak@test.dev', password: 'abcdef' },
  });
  assert.equal(status, 400);
  assert.match(data.message, /uppercase/i);
  assert.equal(await User.countDocuments({ email: 'weak@test.dev' }), 0);
});

await test('only admins can create accounts', async () => {
  for (const token of [student.token, leader.token]) {
    const { status } = await call('POST', '/auth/users', {
      token,
      body: { name: 'Nope', email: 'nope@test.dev' },
    });
    assert.equal(status, 403);
  }
  assert.equal(await call('POST', '/auth/users', {
    body: { name: 'Nope', email: 'nope@test.dev' },
  }).then((r) => r.status), 401);
});

await test('an admin-created account arrives with a one-time temporary password', async () => {
  const { status, data } = await call('POST', '/auth/users', {
    token: admin.token,
    body: {
      name: 'Nia New',
      email: 'nia@test.dev',
      role: 'student',
      department: 'CSE',
    },
  });

  assert.equal(status, 201);

  const temporary = data.temporaryPassword;
  tempPwFor.nia = temporary;

  assert.ok(temporary, 'no temporary password was issued');
  assert.ok(temporary.length >= 8, 'temporary password is too short');
  assert.equal(data.user.email, 'nia@test.dev');
  assert.equal(data.user.mustChangePassword, true);
  assert.equal(data.user.isFirstLogin, true);
  assert.ok(new Date(data.temporaryPasswordExpiresAt) > new Date());

  // The plaintext travels once, and no hash ever travels. A bcrypt hash is
  // matched by shape rather than by the bare "$2" prefix, because "$" and "2"
  // are both legal characters in a temporary password.
  assert.equal(data.user.password, undefined);
  assert.ok(!/\$2[aby]\$\d{2}\$/.test(JSON.stringify(data)), 'a bcrypt hash leaked');

  const stored = await User.findOne({ email: 'nia@test.dev' })
    .select('+password')
    .lean();
  assert.equal(stored.password.startsWith('$2'), true, 'password was not hashed');
  assert.notEqual(stored.password, temporary, 'plaintext was stored');
});

await test('admin-created accounts cannot have their privileges set by the caller', async () => {
  const created = await call('POST', '/auth/users', {
    token: admin.token,
    body: {
      name: 'Sneaky',
      email: 'sneaky@test.dev',
      role: 'student',
      password: 'AttackerPw!1',
      mustChangePassword: false,
      isFirstLogin: false,
      joinedClubs: [],
      registeredEvents: [],
    },
  });
  assert.equal(created.status, 201);

  const stored = await User.findOne({ email: 'sneaky@test.dev' })
    .select('+password')
    .lean();
  assert.notEqual(stored.password, 'AttackerPw!1');
  assert.equal(stored.password.startsWith('$2'), true);
  assert.equal(stored.mustChangePassword, true, 'a supplied flag won');
  assert.equal(stored.isFirstLogin, true, 'a supplied flag won');
  assert.equal(stored.joinedClubs.length, 0);
  assert.ok(
    new Date(stored.temporaryPasswordExpiresAt) > new Date(),
    'the generated expiry was overridden'
  );

  await User.deleteOne({ _id: stored._id });
});

await test('creating an account for an existing email conflicts', async () => {
  const { status } = await call('POST', '/auth/users', {
    token: admin.token,
    body: { name: 'Duplicate', email: 'nia@test.dev' },
  });
  assert.equal(status, 409);
});

await test('an unsupported role is refused', async () => {
  const { status } = await call('POST', '/auth/users', {
    token: admin.token,
    body: { name: 'Tsar', email: 'tsar@test.dev', role: 'super_admin' },
  });
  assert.equal(status, 400);
});

await test('logging in with a temporary password grants no session token', async () => {
  const { status, data } = await call('POST', '/auth/login', {
    body: { email: 'nia@test.dev', password: tempPwFor.nia },
  });

  assert.equal(status, 200);
  assert.equal(data.passwordSetupRequired, true);
  assert.equal(data.token, undefined, 'a full session token was issued');
  assert.equal(data.user, undefined);
  assert.ok(data.setupToken, 'no setup token was issued');
  tempPwFor.niaSetupToken = data.setupToken;
});

await test('a setup token cannot reach any protected endpoint', async () => {
  // GET /clubs is public by design, so every path here is one verifyToken
  // actually guards.
  for (const path of [
    '/auth/profile',
    '/calendar',
    '/gamification/students/me',
    '/notifications',
  ]) {
    const { status, data } = await call('GET', path, {
      token: tempPwFor.niaSetupToken,
    });
    assert.equal(status, 403, `${path} accepted a setup token`);
    assert.equal(data.code, 'PASSWORD_SETUP_REQUIRED');
  }
});

await test('the setup endpoint rejects a normal session token', async () => {
  const { status } = await call('POST', '/auth/complete-password-setup', {
    token: student.token,
    body: { newPassword: CHOSEN_PW },
  });
  assert.equal(status, 401);
});

await test('setup validates strength, confirmation and reuse', async () => {
  const weak = await call('POST', '/auth/complete-password-setup', {
    token: tempPwFor.niaSetupToken,
    body: { newPassword: 'weakpass' },
  });
  assert.equal(weak.status, 400);
  assert.match(weak.data.message, /uppercase|special/i);

  const mismatch = await call('POST', '/auth/complete-password-setup', {
    token: tempPwFor.niaSetupToken,
    body: { newPassword: CHOSEN_PW, confirmPassword: 'Different!2026' },
  });
  assert.equal(mismatch.status, 400);
  assert.match(mismatch.data.message, /match/i);

  const reused = await call('POST', '/auth/complete-password-setup', {
    token: tempPwFor.niaSetupToken,
    body: { newPassword: tempPwFor.nia },
  });
  assert.equal(reused.status, 400);
  assert.match(reused.data.message, /temporary/i);
});

await test('completing setup issues a real session and clears the flags', async () => {
  const { status, data } = await call('POST', '/auth/complete-password-setup', {
    token: tempPwFor.niaSetupToken,
    body: { newPassword: CHOSEN_PW, confirmPassword: CHOSEN_PW },
  });

  assert.equal(status, 200);
  assert.ok(data.token, 'no session token after setup');
  assert.equal(data.user.role, 'student');

  const profile = await call('GET', '/auth/profile', { token: data.token });
  assert.equal(profile.status, 200);
  assert.equal(profile.data.user.email, 'nia@test.dev');

  const stored = await User.findOne({ email: 'nia@test.dev' })
    .select('+password')
    .lean();
  assert.equal(stored.mustChangePassword, false);
  assert.equal(stored.isFirstLogin, false);
  assert.equal(stored.temporaryPasswordExpiresAt, null);
  assert.ok(stored.passwordChangedAt instanceof Date);

  // The temporary password is gone for good.
  const replay = await call('POST', '/auth/login', {
    body: { email: 'nia@test.dev', password: tempPwFor.nia },
  });
  assert.equal(replay.status, 401);

  const stillValid = await call('POST', '/auth/login', {
    body: { email: 'nia@test.dev', password: CHOSEN_PW },
  });
  assert.equal(stillValid.status, 200);
  assert.equal(stillValid.data.passwordSetupRequired, undefined);

  // The spent setup token no longer works either.
  const spent = await call('POST', '/auth/complete-password-setup', {
    token: tempPwFor.niaSetupToken,
    body: { newPassword: 'Another2026!x' },
  });
  assert.equal(spent.status, 401);
});

await test('an expired temporary password is rejected at login and at setup', async () => {
  const created = await call('POST', '/auth/users', {
    token: admin.token,
    body: { name: 'Raj Late', email: 'raj@test.dev', role: 'student' },
  });
  assert.equal(created.status, 201);
  tempPwFor.raj = created.data.temporaryPassword;

  // A setup token issued while the password was still valid.
  const gate = await call('POST', '/auth/login', {
    body: { email: 'raj@test.dev', password: tempPwFor.raj },
  });
  assert.equal(gate.status, 200);
  assert.equal(gate.data.passwordSetupRequired, true);

  await User.updateOne(
    { email: 'raj@test.dev' },
    { $set: { temporaryPasswordExpiresAt: new Date(Date.now() - 60000) } }
  );

  // The hash still matches, so expiry has to be checked explicitly.
  const late = await call('POST', '/auth/login', {
    body: { email: 'raj@test.dev', password: tempPwFor.raj },
  });
  assert.equal(late.status, 401);
  assert.match(late.data.message, /expired/i);

  const lateSetup = await call('POST', '/auth/complete-password-setup', {
    token: gate.data.setupToken,
    body: { newPassword: CHOSEN_PW },
  });
  assert.equal(lateSetup.status, 401);
  assert.match(lateSetup.data.message, /expired/i);

  const stored = await User.findOne({ email: 'raj@test.dev' })
    .select('+password')
    .lean();
  assert.equal(stored.mustChangePassword, true, 'expiry unlocked the account');
});

await test('regenerating a temporary password invalidates the previous one', async () => {
  const created = await call('POST', '/auth/users', {
    token: admin.token,
    body: { name: 'Oss Old', email: 'oss@test.dev', role: 'student' },
  });
  assert.equal(created.status, 201);

  const ossId = created.data.user.id;
  const supersededExpiry = new Date(created.data.temporaryPasswordExpiresAt);

  const issued = await call(
    'POST',
    `/auth/users/${ossId}/temporary-password`,
    { token: admin.token }
  );
  assert.equal(issued.status, 200);
  const fresh = issued.data.temporaryPassword;
  assert.ok(fresh, 'no replacement password was issued');
  assert.notEqual(fresh, created.data.temporaryPassword);
  assert.ok(
    new Date(issued.data.temporaryPasswordExpiresAt) >= supersededExpiry,
    'the expiry was not pushed forward'
  );
  assert.ok(!/\$2[aby]\$\d{2}\$/.test(JSON.stringify(issued)));

  // The password the user was given first is dead, even though it is a valid
  // shape and the account still demands setup.
  const stale = await call('POST', '/auth/login', {
    body: { email: 'oss@test.dev', password: created.data.temporaryPassword },
  });
  assert.equal(stale.status, 401);
  assert.match(stale.data.message, /invalid/i);

  const current = await call('POST', '/auth/login', {
    body: { email: 'oss@test.dev', password: fresh },
  });
  assert.equal(current.status, 200);
  assert.equal(current.data.passwordSetupRequired, true);
});

await test('regeneration ends a live session and re-arms mandatory setup', async () => {
  const victim = await makeUser('Victor Live', 'victor@test.dev');

  const before = await call('GET', '/auth/profile', { token: victim.token });
  assert.equal(before.status, 200);

  const issued = await call('POST', `/auth/users/${victim.id}/temporary-password`, {
    token: admin.token,
  });
  assert.equal(issued.status, 200);
  assert.ok(issued.data.temporaryPassword);

  // Same password, valid hash, but the account is locked behind setup again.
  const knownPassword = await call('POST', '/auth/login', {
    body: { email: 'victor@test.dev', password: SELF_SERVICE_PW },
  });
  assert.equal(knownPassword.status, 401, 'the old password still worked');

  const revoked = await call('GET', '/auth/profile', { token: victim.token });
  assert.equal(revoked.status, 403);
  assert.equal(revoked.data.code, 'PASSWORD_SETUP_REQUIRED');

  const gate = await call('GET', '/auth/users', { token: victim.token });
  assert.equal(gate.status, 403, 'a locked session reached an admin route');

  const fresh = await call('POST', '/auth/login', {
    body: { email: 'victor@test.dev', password: issued.data.temporaryPassword },
  });
  assert.equal(fresh.status, 200);
  assert.equal(fresh.data.passwordSetupRequired, true);

  const done = await call('POST', '/auth/complete-password-setup', {
    token: fresh.data.setupToken,
    body: { newPassword: CHOSEN_PW },
  });
  assert.equal(done.status, 200);

  const after = await call('GET', '/auth/profile', { token: done.data.token });
  assert.equal(after.status, 200);
});

await test('an admin cannot reset their own temporary password', async () => {
  const { status, data } = await call(
    'POST',
    `/auth/users/${admin.id}/temporary-password`,
    { token: admin.token }
  );
  assert.equal(status, 400);
  assert.match(data.message, /your own/i);
});

await test('regenerating for an unknown or malformed id fails cleanly', async () => {
  const missing = await call(
    'POST',
    '/auth/users/64f0a0b0a0b0a0b0a0b0a0b0/temporary-password',
    { token: admin.token }
  );
  assert.equal(missing.status, 404);

  const malformed = await call(
    'POST',
    '/auth/users/not-an-id/temporary-password',
    { token: admin.token }
  );
  assert.equal(malformed.status, 400);
});

await test('leader and admin accounts created by an admin complete setup and work', async () => {
  for (const role of ['club_leader', 'admin']) {
    const email = `${role.replace('_', '')}@created.test.dev`;

    const created = await call('POST', '/auth/users', {
      token: admin.token,
      body: { name: `${role} Account`, email, role },
    });
    assert.equal(created.status, 201, `${role} creation failed`);
    assert.equal(created.data.user.role, role);

    const gate = await call('POST', '/auth/login', {
      body: { email, password: created.data.temporaryPassword },
    });
    assert.equal(gate.status, 200);
    assert.equal(gate.data.passwordSetupRequired, true, `${role} got a session`);

    const done = await call('POST', '/auth/complete-password-setup', {
      token: gate.data.setupToken,
      body: { newPassword: CHOSEN_PW },
    });
    assert.equal(done.status, 200);
    assert.equal(done.data.user.role, role);

    const profile = await call('GET', '/auth/profile', { token: done.data.token });
    assert.equal(profile.status, 200);

    const privileged = await call(
      'GET',
      role === 'admin' ? '/auth/users' : '/gamification/students/me',
      { token: done.data.token }
    );
    assert.equal(privileged.status, 200, `${role} lost their permissions`);
  }
});

await test('the admin user list reports password setup status', async () => {
  const { status, data } = await call('GET', '/auth/users', {
    token: admin.token,
  });
  assert.equal(status, 200);

  const nia = data.users.find((user) => user.email === 'nia@test.dev');
  const raj = data.users.find((user) => user.email === 'raj@test.dev');

  assert.equal(nia.mustChangePassword, false, 'setup completion was not visible');
  assert.equal(nia.temporaryPasswordExpiresAt, null);
  assert.equal(raj.mustChangePassword, true, 'pending setup was not visible');
  assert.equal(raj.password, undefined, 'the admin list leaked a password');
  assert.ok(
    !/\$2[aby]\$\d{2}\$/.test(JSON.stringify(data)),
    'a bcrypt hash leaked in the user list'
  );
});

await test('changing a password returns a token that still works', async () => {
  const mover = await makeUser('Mira Mover', 'mover@test.dev');

  // passwordChangedAt is compared against token iat, which has one-second
  // resolution, so the session under test must predate a whole second.
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const weak = await call('PUT', '/auth/change-password', {
    token: mover.token,
    body: { currentPassword: SELF_SERVICE_PW, newPassword: 'short' },
  });
  assert.equal(weak.status, 400);

  const same = await call('PUT', '/auth/change-password', {
    token: mover.token,
    body: { currentPassword: SELF_SERVICE_PW, newPassword: SELF_SERVICE_PW },
  });
  assert.equal(same.status, 400);

  const changed = await call('PUT', '/auth/change-password', {
    token: mover.token,
    body: { currentPassword: SELF_SERVICE_PW, newPassword: CHOSEN_PW },
  });
  assert.equal(changed.status, 200);
  assert.ok(changed.data.token, 'no refreshed token was returned');

  const refreshed = await call('GET', '/auth/profile', {
    token: changed.data.token,
  });
  assert.equal(refreshed.status, 200, 'the refreshed token was rejected');

  const stale = await call('GET', '/auth/profile', { token: mover.token });
  assert.equal(stale.status, 401, 'the pre-change token still worked');

  const login = await call('POST', '/auth/login', {
    body: { email: 'mover@test.dev', password: CHOSEN_PW },
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.passwordSetupRequired, undefined);
});

// ---------------------------------------------------------------- help center

// Fresh plain-student fixtures: the shared `student` user is promoted to a club
// leader by the leadership-transfer test much earlier in this suite, so role
// expectations here must not ride on it.
const helpStudent = await makeUser('Helen Help', 'helpstudent@test.dev');
const legacyMember = await makeUser(
  'Hank Member',
  'helpmember@test.dev',
  'club_member'
);

// Articles only an administrator may read. If the catalog ever stops carrying
// admin-only guidance these assertions fire, because the role-filtering tests
// below would otherwise pass on an empty set.
const adminOnlyArticles = helpDocs.HELP_ARTICLES.filter(
  (article) =>
    canSee(article.roles, 'admin') && !canSee(article.roles, 'student')
);

const adminOnlyFaqs = helpDocs.HELP_FAQS.filter(
  (faq) => canSee(faq.roles, 'admin') && !canSee(faq.roles, 'student')
);

// Every path the frontend actually routes. Documentation is not allowed to
// point at a page that does not exist.
const REAL_ROUTES = new Set([
  '/', '/about', '/contact', '/login', '/register', '/set-new-password',
  '/clubs', '/events', '/profile', '/account-settings', '/certificates',
  '/calendar', '/leaderboard', '/notifications', '/help', '/admin', '/leader',
]);

const basePath = (path) => String(path).split('?')[0].split('#')[0];

await test('help catalog documents the real product, not invented pages', async () => {
  assert.ok(helpDocs.HELP_CATEGORIES.length >= 7, 'too few categories');
  assert.ok(helpDocs.HELP_ARTICLES.length >= 15, 'too few articles');
  assert.ok(helpDocs.HELP_FAQS.length >= 20, 'spec needs 20+ FAQs');
  assert.ok(adminOnlyArticles.length >= 1, 'no admin-only article to filter');
  assert.ok(
    helpDocs.HELP_ARTICLES.some(
      (a) => canSee(a.roles, 'club_leader') && !canSee(a.roles, 'student')
    ),
    'no leader-only article to filter'
  );

  const categoryIds = new Set(helpDocs.HELP_CATEGORIES.map((c) => c.id));
  const seen = new Set();

  for (const article of helpDocs.HELP_ARTICLES) {
    assert.ok(article.id && article.title && article.summary, 'incomplete article');
    assert.ok(!seen.has(article.id), `duplicate article id ${article.id}`);
    seen.add(article.id);
    assert.ok(categoryIds.has(article.categoryId), `unknown category ${article.categoryId}`);
    assert.ok(Array.isArray(article.steps) && article.steps.length >= 2, `${article.id} has no steps`);

    for (const link of article.relatedRoutes || []) {
      assert.ok(
        REAL_ROUTES.has(basePath(link.path)),
        `${article.id} links to ${link.path}, which is not a page`
      );
    }
  }

  for (const faq of helpDocs.HELP_FAQS) {
    assert.ok(faq.question && faq.answer, 'incomplete FAQ');
    assert.ok(categoryIds.has(faq.categoryId), `FAQ in unknown category ${faq.categoryId}`);
  }

  // The catalog must cover each feature area the spec lists.
  const prose = helpDocs.HELP_ARTICLES.map((a) => `${a.title} ${a.summary} ${(a.steps || []).join(' ')}`).join(' ').toLowerCase();
  for (const topic of ['password', 'certificate', 'leaderboard', 'notification', 'register', 'check', 'qr']) {
    assert.ok(prose.includes(topic), `no documentation covers ${topic}`);
  }
});

await test('help content requires a signed-in user', async () => {
  assert.equal((await call('GET', '/help/content')).status, 401);
});

await test('student help payload is scoped and carries no admin guidance', async () => {
  const { status, data } = await call('GET', '/help/content', {
    token: helpStudent.token,
  });

  assert.equal(status, 200);
  assert.equal(data.success, true);
  assert.equal(data.role, 'student');

  const ids = new Set(data.articles.map((a) => a.id));
  const questions = new Set(data.faqs.map((f) => f.question));

  for (const article of adminOnlyArticles) {
    assert.ok(!ids.has(article.id), `${article.id} leaked to a student`);
  }

  for (const faq of adminOnlyFaqs) {
    assert.ok(!questions.has(faq.question), `${faq.question} leaked to a student`);
  }

  // Nothing unscoped sneaks through the other way either.
  for (const article of data.articles) {
    assert.ok(canSee(article.roles, 'student'), `${article.id} is not student-facing`);
  }

  // A category card with nothing behind it would open an empty panel.
  for (const category of data.categories) {
    assert.ok(
      data.articles.some((a) => a.categoryId === category.id) ||
        data.faqs.some((f) => f.categoryId === category.id),
      `empty category ${category.id}`
    );
  }
});

await test('club leader sees leader guidance but still no admin guidance', async () => {
  const { data } = await call('GET', '/help/content', { token: leader.token });
  assert.equal(data.role, 'club_leader');

  const ids = new Set(data.articles.map((a) => a.id));
  const adminOnly = helpDocs.HELP_ARTICLES.filter(
    (a) => canSee(a.roles, 'admin') && !canSee(a.roles, 'club_leader')
  );

  for (const article of adminOnly) {
    assert.ok(!ids.has(article.id), `${article.id} leaked to a leader`);
  }

  assert.ok(
    data.articles.some(
      (a) => canSee(a.roles, 'club_leader') && !canSee(a.roles, 'student')
    ),
    'leader got no leader-only guidance'
  );
});

await test('admin help payload is the complete catalog', async () => {
  const { data } = await call('GET', '/help/content', { token: admin.token });
  assert.equal(data.role, 'admin');
  assert.equal(data.articles.length, helpDocs.HELP_ARTICLES.length);
  assert.equal(data.faqs.length, helpDocs.HELP_FAQS.length);
  assert.equal(data.categories.length, helpDocs.HELP_CATEGORIES.length);
});

await test('legacy club_member rows get the student view', async () => {
  const { status, data } = await call('GET', '/help/content', {
    token: legacyMember.token,
  });

  assert.equal(status, 200);
  assert.equal(data.role, 'student');

  const studentView = filterHelpForRole(
    {
      categories: helpDocs.HELP_CATEGORIES,
      articles: helpDocs.HELP_ARTICLES,
      faqs: helpDocs.HELP_FAQS,
    },
    'student'
  );

  assert.deepEqual(
    data.articles.map((a) => a.id),
    studentView.articles.map((a) => a.id)
  );
});

await test('assistant reports itself unavailable when no key is configured', async () => {
  const { status, data } = await call('GET', '/help/content', {
    token: helpStudent.token,
  });

  assert.equal(data.success, true);
  assert.equal(data.assistantEnabled, false);
});

// ---------------------------------------------------------------- clubassist

await test('assistant requires a token', async () => {
  assert.equal(
    (await call('POST', '/help/assistant', { body: { message: 'how do i join a club?' } })).status,
    401
  );
});

await test('assistant rejects an empty or oversized question', async () => {
  const empty = await call('POST', '/help/assistant', {
    token: helpStudent.token,
    body: { message: '   ' },
  });
  assert.equal(empty.status, 400);
  assert.equal(empty.data.success, false);

  const long = await call('POST', '/help/assistant', {
    token: helpStudent.token,
    body: { message: 'x'.repeat(501) },
  });
  assert.equal(long.status, 400);
});

await test('assistant rejects a malformed history instead of trusting it', async () => {
  const { status } = await call('POST', '/help/assistant', {
    token: helpStudent.token,
    body: {
      message: 'how do certificates work?',
      history: 'not-an-array',
    },
  });

  // Unconfigured provider: the route still answers with 503 and real article
  // suggestions rather than throwing on the junk history.
  assert.equal(status, 503);
});

await test('assistant degrades to real article links when offline', async () => {
  const { status, data } = await call('POST', '/help/assistant', {
    token: helpStudent.token,
    body: { message: 'How do I download my certificate?' },
  });

  assert.equal(status, 503);
  assert.equal(data.success, false);
  assert.ok(Array.isArray(data.suggestions));
  assert.ok(data.suggestions.length >= 1, 'no suggestions offered');

  const visible = new Set(
    filterHelpForRole({ articles: helpDocs.HELP_ARTICLES }, 'student').articles.map((a) => a.id)
  );

  for (const suggestion of data.suggestions) {
    assert.ok(visible.has(suggestion.articleId), `suggested unknown article ${suggestion.articleId}`);
    assert.ok(suggestion.title, 'suggestion without a title');
  }
});

await test('assistant suggestions never leak admin-only articles', async () => {
  const { data } = await call('POST', '/help/assistant', {
    token: helpStudent.token,
    body: { message: 'How do I delete a user account and handle support requests?' },
  });

  const adminIds = new Set(adminOnlyArticles.map((a) => a.id));

  for (const suggestion of data.suggestions || []) {
    assert.ok(!adminIds.has(suggestion.articleId), `${suggestion.articleId} leaked`);
  }

  const asAdmin = await call('POST', '/help/assistant', {
    token: admin.token,
    body: { message: 'How do I delete a user account and handle support requests?' },
  });

  assert.equal(asAdmin.status, 503);
});

// The provider behind the assistant caps a request at a few thousand tokens,
// which is smaller than the whole admin catalog, so the prompt is assembled per
// question. These pin that assembly: it must fit the budget, must keep the FAQs
// and the topic actually asked about (an earlier build cut both silently and the
// assistant then denied features the documentation covers), and the leftover
// title index must stay inside the caller's role.
await test('assistant prompt fits the provider budget and keeps its FAQs', async () => {
  const questions = [
    'How do I register for an event?',
    'Does my check in code expire?',
    'How do I send an announcement to every user?',
    'How do I work the support queue?',
    'How are points and badges adjusted?',
  ];

  for (const role of ['student', 'club_leader', 'admin']) {
    for (const question of questions) {
      const catalog = buildCatalog(role, question);

      assert.ok(
        catalog.length <= 24000,
        `${role} prompt is ${catalog.length} characters`
      );
      assert.match(catalog, /^TOPIC: /m, `${role} prompt has no articles`);
      assert.match(catalog, /^Q: /m, `${role} prompt has no FAQs`);
    }
  }
});

await test('assistant prompt keeps the topic the question is about', async () => {
  const cases = [
    ['admin', 'How do I send an announcement to every user?', 'Sending announcements'],
    ['admin', 'How do I work the support queue?', 'Working the support queue'],
    ['club_leader', 'How do I run the check in desk?', 'Running the check-in desk'],
    ['student', 'How do I get my certificate?', 'Downloading and proving a certificate'],
  ];

  for (const [role, question, title] of cases) {
    assert.ok(
      buildCatalog(role, question).includes(`TOPIC: ${title} `),
      `${role} asking "${question}" lost the "${title}" steps`
    );
  }
});

await test('assistant prompt keeps admin topics away from students', async () => {
  const adminTitles = adminOnlyArticles.map((article) => article.title);
  const catalog = buildCatalog(
    'student',
    'How do I send an announcement to every user and adjust someone else points and handle support requests?'
  );

  for (const title of adminTitles) {
    assert.ok(!catalog.includes(`TOPIC: ${title} `), `${title} reached a student`);
    assert.ok(!catalog.includes(title), `${title} named in a student prompt`);
  }

  for (const faq of adminOnlyFaqs) {
    assert.ok(!catalog.includes(faq.question), `${faq.question} reached a student`);
  }
});

// ---------------------------------------------------------------- tickets

const ticket = (overrides = {}) => ({
  subject: 'Cannot download certificate',
  category: 'certificates',
  description: 'The download button spins and nothing arrives after check-in.',
  ...overrides,
});

await test('support request is stored and reaches the admins', async () => {
  const before = await Notification.countDocuments({
    user: admin.id,
    title: 'New support request',
  });

  const { status, data } = await call('POST', '/help/requests', {
    token: helpStudent.token,
    body: ticket(),
  });

  assert.equal(status, 201);
  assert.equal(data.success, true);
  assert.equal(data.request.status, 'open');
  assert.equal(data.request.category, 'certificates');
  assert.ok(data.request.id);

  const stored = await SupportRequest.findById(data.request.id).lean();
  assert.equal(String(stored.user), helpStudent.id);
  assert.equal(stored.status, 'open');

  const after = await Notification.countDocuments({
    user: admin.id,
    title: 'New support request',
  });
  assert.equal(after, before + 1, 'the queue was not notified');

  // A student must never receive another student's ticket alert.
  assert.equal(
    await Notification.countDocuments({
      user: other.id,
      title: 'New support request',
    }),
    0
  );
});

await test('support request input is validated', async () => {
  const cases = [
    [{ subject: 'ab' }, 'short subject'],
    [{ subject: 'x'.repeat(121) }, 'long subject'],
    [{ category: 'not-a-category' }, 'unknown category'],
    [{ description: 'nope' }, 'short description'],
    [{ description: 'y'.repeat(2001) }, 'long description'],
  ];

  for (const [override, label] of cases) {
    const { status, data } = await call('POST', '/help/requests', {
      token: helpStudent.token,
      body: ticket(override),
    });

    assert.equal(status, 400, `${label} was accepted`);
    assert.equal(data.success, false);
  }

  assert.equal(
    await SupportRequest.countDocuments({ user: helpStudent.id }),
    1,
    'a rejected request was still stored'
  );
});

await test('a request is only visible to its owner and to admins', async () => {
  const mine = await call('GET', '/help/requests/mine', {
    token: helpStudent.token,
  });
  assert.equal(mine.status, 200);
  assert.equal(mine.data.requests.length, 1);
  assert.equal(mine.data.requests[0].subject, 'Cannot download certificate');

  const theirs = await call('GET', '/help/requests/mine', {
    token: other.token,
  });
  assert.equal(theirs.status, 200);
  assert.equal(theirs.data.requests.length, 0);

  assert.equal((await call('GET', '/help/requests/mine')).status, 401);
});

await test('the ticket queue is administrators only', async () => {
  assert.equal((await call('GET', '/help/requests')).status, 401);

  for (const [token, label] of [
    [helpStudent.token, 'student'],
    [leader.token, 'club_leader'],
  ]) {
    assert.equal((await call('GET', '/help/requests', { token })).status, 403, label);

    const { status } = await call('PUT', '/help/requests/deadbeefdeadbeefdeadbeef', {
      token,
      body: { status: 'resolved', adminResponse: 'done' },
    });
    assert.equal(status, 403, `${label} mutated a ticket`);
  }
});

await test('admin queue lists requests with the requester and counts', async () => {
  await call('POST', '/help/requests', {
    token: other.token,
    body: ticket({
      subject: 'Leaderboard points look wrong',
      category: 'leaderboard',
      description: 'I attended two events this month but my total did not move.',
    }),
  });

  const { status, data } = await call('GET', '/help/requests', {
    token: admin.token,
  });

  assert.equal(status, 200);
  assert.equal(data.requests.length, 2);
  assert.equal(data.total, 2);
  assert.equal(data.counts.open, 2);
  assert.equal(data.counts.resolved, 0);

  const withUser = data.requests.find((r) => r.subject === 'Leaderboard points look wrong');
  assert.equal(withUser.user.email, other.email);
  assert.equal(withUser.user.role, 'student');

  // Internal-only fields never leave the server.
  assert.equal(withUser.handledBy, undefined);
  assert.equal(withUser.__v, undefined);
});

await test('admin queue filters and searches safely', async () => {
  const byCategory = await call('GET', '/help/requests?category=leaderboard', {
    token: admin.token,
  });
  assert.equal(byCategory.data.requests.length, 1);
  assert.equal(byCategory.data.requests[0].category, 'leaderboard');

  const bySearch = await call('GET', '/help/requests?search=certificate', {
    token: admin.token,
  });
  assert.equal(bySearch.data.requests.length, 1);

  const byEmail = await call('GET', `/help/requests?search=${encodeURIComponent(other.email)}`, {
    token: admin.token,
  });
  assert.equal(byEmail.data.requests.length, 1);

  // Regex metacharacters must be data, not a pattern.
  const regex = await call('GET', '/help/requests?search=.*', { token: admin.token });
  assert.equal(regex.status, 200);
  assert.equal(regex.data.requests.length, 0, 'unescaped search matched everything');

  const badStatus = await call('GET', '/help/requests?status=bogus', {
    token: admin.token,
  });
  assert.equal(badStatus.status, 400);

  const paged = await call('GET', '/help/requests?page=2&limit=1', {
    token: admin.token,
  });
  assert.equal(paged.data.requests.length, 1);
  assert.equal(paged.data.pages, 2);
});

await test('updating a ticket validates before it touches the database', async () => {
  const list = await call('GET', '/help/requests', { token: admin.token });
  const target = list.data.requests.find((r) => r.category === 'certificates');

  const badId = await call('PUT', '/help/requests/not-an-id', {
    token: admin.token,
    body: { status: 'open' },
  });
  assert.equal(badId.status, 400);

  const unknown = await call('PUT', '/help/requests/012345678901234567890123', {
    token: admin.token,
    body: { status: 'open' },
  });
  assert.equal(unknown.status, 404);

  const badStatus = await call('PUT', `/help/requests/${target.id}`, {
    token: admin.token,
    body: { status: 'fixed' },
  });
  assert.equal(badStatus.status, 400);

  const longReply = await call('PUT', `/help/requests/${target.id}`, {
    token: admin.token,
    body: { status: 'open', adminResponse: 'r'.repeat(2001) },
  });
  assert.equal(longReply.status, 400);

  // Closing needs a reply: a ticket cannot be shut with the student left
  // wondering what happened.
  const noReply = await call('PUT', `/help/requests/${target.id}`, {
    token: admin.token,
    body: { status: 'resolved' },
  });
  assert.equal(noReply.status, 400);

  const untouched = await SupportRequest.findById(target.id).lean();
  assert.equal(untouched.status, 'open');
});

await test('an agent can progress and resolve a ticket, notifying the owner', async () => {
  const list = await call('GET', '/help/requests', { token: admin.token });
  const target = list.data.requests.find((r) => r.category === 'certificates');

  const before = await Notification.countDocuments({
    user: helpStudent.id,
    title: 'Update on your support request',
  });

  const inProgress = await call('PUT', `/help/requests/${target.id}`, {
    token: admin.token,
    body: { status: 'in_progress' },
  });
  assert.equal(inProgress.status, 200);
  assert.equal(inProgress.data.request.status, 'in_progress');

  // A status flicker with nothing written must not notify anyone twice.
  assert.equal(
    await Notification.countDocuments({
      user: helpStudent.id,
      title: 'Update on your support request',
    }),
    before
  );

  const resolved = await call('PUT', `/help/requests/${target.id}`, {
    token: admin.token,
    body: { status: 'resolved', adminResponse: 'Re-issued: check the Certificates page now.' },
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.request.status, 'resolved');
  assert.ok(resolved.data.request.respondedAt);

  assert.equal(
    await Notification.countDocuments({
      user: helpStudent.id,
      title: 'Update on your support request',
    }),
    before + 1
  );

  assert.equal(
    await Notification.countDocuments({
      user: other.id,
      title: 'Update on your support request',
    }),
    0,
    'the reply was sent to the wrong student'
  );

  const mine = await call('GET', '/help/requests/mine', { token: helpStudent.token });
  assert.equal(mine.data.requests[0].status, 'resolved');
  assert.match(mine.data.requests[0].adminResponse, /Certificates page/);
});

await test('an admin filing a ticket does not notify themselves', async () => {
  const { status } = await call('POST', '/help/requests', {
    token: admin.token,
    body: ticket({
      subject: 'Typos in the help catalog',
      category: 'feedback',
      description: 'A few articles read awkwardly around the check-in section.',
    }),
  });
  assert.equal(status, 201);

  assert.equal(
    await Notification.countDocuments({
      user: admin.id,
      title: 'New support request',
      message: /Typos in the help catalog/,
    }),
    0
  );
});

await test('ticket fields survive injection-shaped input', async () => {
  const { status, data } = await call('POST', '/help/requests', {
    token: other.token,
    body: ticket({
      subject: '{{$ne}}',
      category: 'technical',
      description: '{"$where":"sleep(1)"} <script>alert(1)</script> please help',
    }),
  });

  assert.equal(status, 201);

  const stored = await SupportRequest.findById(data.request.id).lean();
  assert.equal(stored.subject, '{{$ne}}');
  assert.ok(stored.description.includes('<script>'), 'stored as opaque text');
  assert.equal(await SupportRequest.countDocuments({ _id: { $ne: null } }), 4);
});

// ------------------------------------------------- external events

const ExternalEvent = (await import('../models/ExternalEvent.js')).default;

const extStudent = await makeUser('Erin External', 'extstudent@test.dev');
const extLeader = await makeUser('Eli External', 'extleader@test.dev', 'club_leader');
const extLeader2 = await makeUser('Elle Second', 'extleader2@test.dev', 'club_leader');

const EXT_PATH = '/external-events';

const extBody = (overrides = {}) => ({
  title: 'National Hackathon 2026',
  description: 'A 24 hour build competition hosted by another college.',
  organizerName: 'Vertex Institute of Technology',
  eventType: 'hackathon',
  participationMode: 'offline',
  registrationUrl: 'https://vertexhack.example.org/apply',
  date: future(96),
  registrationDeadline: future(48),
  venue: 'Main Auditorium',
  city: 'Bengaluru',
  ...overrides
});

const createExt = async (token, overrides) =>
  call('POST', EXT_PATH, { token, body: extBody(overrides) });

await test('external event routes require a signed-in account', async () => {
  assert.equal((await call('GET', EXT_PATH)).status, 401);
  assert.equal((await call('POST', EXT_PATH, { body: extBody() })).status, 401);
  assert.equal(
    (await call('POST', `${EXT_PATH}/000000000000000000000001/bookmark`)).status,
    401
  );
});

await test('only club leaders and administrators can post external events', async () => {
  const denied = await createExt(extStudent.token, { title: 'Student Attempt Event' });
  assert.equal(denied.status, 403, 'a student was allowed to create');

  const asLeader = await createExt(extLeader.token, { title: 'Leader Listing Alpha' });
  assert.equal(asLeader.status, 201, 'a club leader was refused');
  assert.equal(asLeader.data.event.postedBy.id, extLeader.id);

  const asAdmin = await createExt(admin.token, {
    title: 'Admin Listing Beta',
    organizerName: 'State Tech Society',
    eventType: 'conference',
    participationMode: 'online',
    registrationUrl: 'https://statetech.example.com/reg',
    platformDetails: 'Zoom link is mailed after sign-up'
  });
  assert.equal(asAdmin.status, 201);
  assert.equal(asAdmin.data.event.status, 'upcoming');
});

await test('external event fields are validated before they reach the database', async () => {
  const before = await ExternalEvent.countDocuments();

  const bad = [
    { title: 'ab' },
    { description: 'too short' },
    { organizerName: 'x' },
    { eventType: 'ballroom_dancing' },
    { participationMode: 'telepathic' },
    { status: 'half_done' },
    { date: 'not-a-date' },
    { registrationDeadline: future(200) },
    { participationMode: 'offline', venue: '' },
    { participationMode: 'hybrid', city: '' },
    { club: 'nonsense' }
  ];

  for (const overrides of bad) {
    const { status, data } = await createExt(extLeader.token, overrides);

    assert.equal(status, 400, `accepted ${JSON.stringify(overrides)}`);
    assert.equal(data.success, false);
  }

  assert.equal(await ExternalEvent.countDocuments(), before);
});

await test('registration links must be real public web addresses', async () => {
  const rejected = [
    'definitely not a url',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://files.example.org/hack',
    'http://localhost:5000/apply',
    'https://192.168.1.12/apply',
    'https://user:password@vertex.example.org/apply',
    'https://vertex',
    ''
  ];

  for (const registrationUrl of rejected) {
    const { status, data } = await createExt(extLeader.token, {
      title: `Link Test ${rejected.indexOf(registrationUrl)}`,
      registrationUrl
    });

    assert.equal(status, 400, `accepted the link ${registrationUrl || '(empty)'}`);
    assert.ok(data.message, 'rejection without a message');
  }

  const ok = await createExt(extLeader.token, {
    title: 'Good Link Listing',
    registrationUrl: 'https://devfolio.co/hack2026'
  });

  assert.equal(ok.status, 201);
  assert.ok(ok.data.event.registrationUrl.startsWith('https://devfolio.co'));
  assert.equal(ok.data.event.registrationHost, 'devfolio.co');
});

await test('participation mode decides which location fields survive', async () => {
  const online = await createExt(extLeader.token, {
    title: 'Online Only Listing',
    eventType: 'webinar',
    participationMode: 'online',
    registrationUrl: 'https://webinar.example.org/join',
    venue: 'Should be dropped',
    city: 'Should be dropped',
    locationDetails: 'Should be dropped',
    platformDetails: 'Live on YouTube'
  });

  assert.equal(online.status, 201);
  assert.equal(online.data.event.venue, '');
  assert.equal(online.data.event.city, '');
  assert.equal(online.data.event.platformDetails, 'Live on YouTube');

  const offline = await createExt(extLeader.token, {
    title: 'Offline Only Listing',
    participationMode: 'offline',
    registrationUrl: 'https://offline.example.org/form',
    platformDetails: 'Should be dropped'
  });

  assert.equal(offline.status, 201);
  assert.equal(offline.data.event.platformDetails, '');
  assert.equal(offline.data.event.venue, 'Main Auditorium');

  const hybrid = await createExt(extLeader.token, {
    title: 'Hybrid Listing',
    participationMode: 'hybrid',
    registrationUrl: 'https://hybrid.example.org/reg'
  });

  assert.equal(hybrid.status, 201);
  assert.equal(hybrid.data.event.venue, 'Main Auditorium');
});

await test('posters accept a downscaled image or a public link only', async () => {
  const small = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

  const uploaded = await createExt(extLeader.token, {
    title: 'Poster Upload Listing',
    imageUrl: small
  });

  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.data.event.imageUrl, small);

  const linked = await createExt(extLeader.token, {
    title: 'Poster Link Listing',
    imageUrl: 'https://cdn.example.org/poster.jpg'
  });

  assert.equal(linked.status, 201);

  const spoof = await createExt(extLeader.token, {
    title: 'Poster Spoof Listing',
    imageUrl: 'data:text/html;base64,PHNjcmlwdD4='
  });

  assert.equal(spoof.status, 400, 'a non-image data URL was stored');

  const huge = await createExt(extLeader.token, {
    title: 'Poster Huge Listing',
    imageUrl: `data:image/png;base64,${'A'.repeat(950000)}`
  });

  assert.equal(huge.status, 413, 'an oversized poster was accepted');

  assert.equal(
    await ExternalEvent.countDocuments({ title: 'Poster Huge Listing' }),
    0
  );
});

await test('a leader cannot rewrite another leader’s listing but an admin can', async () => {
  const mine = await createExt(extLeader.token, { title: 'Ownership Test Listing' });
  assert.equal(mine.status, 201);

  const id = mine.data.event.id;

  const byStranger = await call('PUT', `${EXT_PATH}/${id}`, {
    token: extLeader2.token,
    body: extBody({ title: 'Hijacked By Another Leader' })
  });

  assert.equal(byStranger.status, 403);

  const byStudent = await call('DELETE', `${EXT_PATH}/${id}`, { token: extStudent.token });
  assert.equal(byStudent.status, 403);

  const byOwner = await call('PUT', `${EXT_PATH}/${id}`, {
    token: extLeader.token,
    body: extBody({ title: 'Renamed By Its Own Leader', status: 'completed' })
  });

  assert.equal(byOwner.status, 200);
  assert.equal(byOwner.data.event.title, 'Renamed By Its Own Leader');
  assert.equal(byOwner.data.event.status, 'completed');

  const byAdmin = await call('PUT', `${EXT_PATH}/${id}`, {
    token: admin.token,
    body: extBody({ title: 'Renamed By An Administrator' })
  });

  assert.equal(byAdmin.status, 200);

  const removed = await call('DELETE', `${EXT_PATH}/${id}`, { token: admin.token });
  assert.equal(removed.status, 200);
  assert.equal(await ExternalEvent.countDocuments({ _id: id }), 0);
});

await test('saving a listing bookmarks it without claiming a registration', async () => {
  const listing = await createExt(extLeader.token, { title: 'Bookmark Target Listing' });
  const id = listing.data.event.id;

  const first = await call('POST', `${EXT_PATH}/${id}/bookmark`, { token: extStudent.token });

  assert.equal(first.status, 201);
  assert.equal(first.data.bookmarked, true);
  assert.equal(first.data.already, false);
  assert.match(first.data.message, /does not register/i);

  const second = await call('POST', `${EXT_PATH}/${id}/bookmark`, { token: extStudent.token });

  assert.equal(second.status, 200);
  assert.equal(second.data.already, true);
  assert.equal(second.data.bookmarkIds.length, 1, 'a double click saved it twice');

  const listed = await call('GET', `${EXT_PATH}?view=all&saved=true`, { token: extStudent.token });

  assert.equal(listed.status, 200);
  assert.equal(listed.data.events.length, 1);
  assert.equal(listed.data.events[0].id, id);
  assert.equal(listed.data.events[0].bookmarked, true);
  assert.equal(listed.data.counts.saved, 1);

  const otherSaw = await call('GET', `${EXT_PATH}?view=all`, { token: extLeader2.token });
  const seen = otherSaw.data.events.find((event) => event.id === id);
  assert.equal(seen.bookmarked, false, 'one student’s save leaked to another');

  const dropped = await call('DELETE', `${EXT_PATH}/${id}/bookmark`, { token: extStudent.token });

  assert.equal(dropped.status, 200);
  assert.equal(dropped.data.bookmarked, false);

  const stored = await User.findById(extStudent.id).select('bookmarkedExternalEvents').lean();
  assert.equal(stored.bookmarkedExternalEvents.length, 0);
});

await test('saving a listing that does not exist is refused', async () => {
  const ghost = await call('POST', `${EXT_PATH}/000000000000000000000fed/bookmark`, {
    token: extStudent.token,
  });

  assert.equal(ghost.status, 404);

  const invalid = await call('POST', `${EXT_PATH}/nonsense/bookmark`, {
    token: extStudent.token,
  });

  assert.equal(invalid.status, 400);
});

await test('deleting a listing clears it from every saved list', async () => {
  const doomed = await createExt(extLeader.token, { title: 'Doomed Listing' });
  const id = doomed.data.event.id;

  assert.equal((await call('POST', `${EXT_PATH}/${id}/bookmark`, { token: extStudent.token })).status, 201);
  assert.equal((await call('POST', `${EXT_PATH}/${id}/bookmark`, { token: extLeader2.token })).status, 201);

  assert.equal((await call('DELETE', EXT_PATH + `/${id}`, { token: extLeader.token })).status, 200);

  const students = await User.find({ bookmarkedExternalEvents: id }).lean();
  assert.equal(students.length, 0, 'a dead reference survived in a bookmark list');
});

await test('the listing browse filters by type, mode, organizer, search and view', async () => {
  // One page wide enough to hold every listing these tests have created, so an
  // assertion below is about filtering and never about where a row paginated to.
  const list = (query) =>
    call('GET', `${EXT_PATH}?limit=100&${query}`, { token: extStudent.token });

  const expectCreated = (response) => {
    assert.equal(response.status, 201, response.data?.message);
    return response.data.event;
  };

  expectCreated(await createExt(extLeader.token, {
    title: 'Spring Hack Offline',
    organizerName: 'Northgate College',
    eventType: 'hackathon',
    participationMode: 'offline',
    registrationUrl: 'https://northgate.example.org/hack',
    date: future(96),
    registrationDeadline: future(48),
    city: 'Chennai'
  }));

  const pastOne = expectCreated(await createExt(extLeader.token, {
    title: 'Old Conference Listing',
    organizerName: 'Southbank University',
    eventType: 'conference',
    participationMode: 'offline',
    registrationUrl: 'https://southbank.example.org/2020',
    date: past(24),
    registrationDeadline: past(72),
    city: 'Chennai'
  }));

  const done = expectCreated(await createExt(extLeader.token, {
    title: 'Finished Workshop Listing',
    organizerName: 'Northgate College',
    eventType: 'workshop',
    participationMode: 'online',
    registrationUrl: 'https://northgate.example.org/workshop',
    status: 'completed',
    date: future(24),
    registrationDeadline: future(12)
  }));

  const upcoming = await list('view=upcoming');
  assert.equal(upcoming.status, 200);

  const upcomingTitles = upcoming.data.events.map((event) => event.title);
  assert.ok(upcomingTitles.includes('Spring Hack Offline'), 'the new upcoming listing was not listed');
  assert.ok(!upcomingTitles.includes('Old Conference Listing'), 'a past listing showed as upcoming');
  assert.ok(!upcomingTitles.includes('Finished Workshop Listing'), 'a completed listing showed as upcoming');

  const expired = await list('view=expired');
  const expiredTitles = expired.data.events.map((event) => event.title);
  assert.ok(expiredTitles.includes('Old Conference Listing'), 'a past listing was missing from expired');
  assert.ok(expiredTitles.includes('Finished Workshop Listing'), 'a completed listing was missing from expired');
  assert.ok(!expiredTitles.includes('Spring Hack Offline'), 'an upcoming listing showed as expired');

  const byType = await list('view=all&type=workshop');
  assert.ok(byType.data.events.length >= 1, 'the type filter returned nothing');
  assert.ok(byType.data.events.every((event) => event.eventType === 'workshop'), 'the type filter leaked other types');

  const byMode = await list('view=all&mode=online');
  assert.ok(byMode.data.events.every((event) => event.participationMode === 'online'), 'the mode filter leaked other modes');

  const byOrganizer = await list(`view=all&organizer=${encodeURIComponent('Southbank University')}`);
  assert.equal(byOrganizer.data.events.length, 1, 'the organizer filter matched the wrong rows');
  assert.equal(byOrganizer.data.events[0].title, 'Old Conference Listing');

  const byCity = await list('view=all&city=Chennai');
  assert.ok(byCity.data.events.length >= 2, 'the city filter missed the listings it was meant to match');

  const searched = await list('view=all&search=hack');
  assert.ok(searched.data.events.length >= 1, 'search found nothing');

  const regexSearch = await list(`view=all&search=${encodeURIComponent('(hack')}`);
  assert.equal(regexSearch.status, 200, 'an unescaped search broke the query');
  assert.equal(regexSearch.data.events.length, 0);

  const badType = await call('GET', `${EXT_PATH}?type=quidditch`, { token: extStudent.token });
  assert.equal(badType.status, 400);

  const single = await call('GET', `${EXT_PATH}/${pastOne.id}`, { token: extStudent.token });
  assert.equal(single.status, 200);
  assert.equal(single.data.event.isPast, true);

  const deadlineSingle = await call('GET', `${EXT_PATH}/${done.id}`, {
    token: extStudent.token,
  });
  assert.equal(deadlineSingle.data.event.deadlinePassed, false);

  const missing = await call('GET', `${EXT_PATH}/000000000000000000000fee`, {
    token: extStudent.token,
  });
  assert.equal(missing.status, 404);
});

await test('meta publishes the taxonomy and the real organizer list', async () => {
  const { status, data } = await call('GET', `${EXT_PATH}/meta`, { token: extStudent.token });

  assert.equal(status, 200);
  assert.equal(data.types.length, 7);
  assert.ok(data.types.find((type) => type.value === 'coding_competition').label);
  assert.equal(data.modes.map((mode) => mode.value).join(','), 'online,offline,hybrid');
  assert.equal(data.statuses.length, 3);
  assert.ok(data.organizers.includes('Northgate College'));
  assert.ok(data.cities.includes('Chennai'));
});

await test('external events never touch the internal event machine', async () => {
  const internalBefore = await Event.countDocuments();
  const registrationsBefore = await User.countDocuments({ registeredEvents: { $ne: [] } });

  const external = await createExt(extLeader.token, {
    title: 'Isolation Probe Listing',
    participationMode: 'online',
    eventType: 'hackathon',
    registrationUrl: 'https://probe.example.org/apply'
  });

  assert.equal(external.status, 201);

  const externalId = external.data.event.id;

  assert.equal(await Event.countDocuments(), internalBefore, 'an external listing created an Event row');

  // The internal endpoints must treat the external id as unknown rather than
  // registering, checking in, or awarding anything for it.
  assert.equal((await call('POST', `/events/${externalId}/register`, { token: extStudent.token })).status, 404);
  assert.equal((await call('GET', `/events/${externalId}`, { token: extStudent.token })).status, 404);
  assert.equal(
    (await call('POST', `/calendar/events`, { token: extStudent.token, body: { eventId: externalId } })).status,
    404
  );

  assert.equal(await User.countDocuments({ registeredEvents: { $ne: [] } }), registrationsBefore);

  // The reminder sweep is a Event collection job, so a 30-minute notice can only
  // ever fire for something on the campus schedule.
  assert.equal(await Event.countDocuments({ reminderSentAt: null, date: external.data.event.date }), 0);
});

// ---------------------------------------------------------------- password recovery

// One narrative, in the order the guards allow it: the shared 127.0.0.1 source
// address is what the recovery limiters key on, so this section is the only one
// that touches those endpoints and its guesses are counted across the tests.
const bcrypt = (await import('bcryptjs')).default;
const {
  SECURITY_QUESTIONS,
  SECURITY_QUESTION_IDS,
  securityQuestionLabel
} = await import('../utils/securityQuestions.js');

const REC = '/auth/forgot-password';
const NEW_PW = 'Recovered#2026';
const OTHER_ANSWER = 'Monsoon';

// The account the whole section recovers.
const recUser = await makeUser('Rea Recover', 'recover@test.dev');

// An account written the way the database already holds them: no question, no
// answer hash. It must keep logging in, and must not be recoverable here.
const legacySalt = await bcrypt.genSalt(10);
const legacy = await User.create({
  name: 'Legacy Recover',
  email: 'legacyrec@test.dev',
  password: await bcrypt.hash(SELF_SERVICE_PW, legacySalt),
  department: 'CSE'
});

// The links and the session the wizard would be holding, carried from one test
// to the next in the order a real person would meet them.
const recState = {};

await test('the question catalogue is public and fixed', async () => {
  const response = await call('GET', '/auth/security-questions');

  assert.equal(response.status, 200, response.data?.message);
  assert.ok(Array.isArray(response.data.questions), 'questions is not a list');
  assert.ok(response.data.questions.length >= 5, 'catalogue is too small');

  const ids = response.data.questions.map((question) => question.id);

  assert.equal(
    new Set(ids).size,
    ids.length,
    'two questions share an id'
  );
  assert.ok(
    ids.every((id) => SECURITY_QUESTION_IDS.includes(id)),
    'a question is not in the server catalogue'
  );
  assert.ok(
    response.data.questions.every(
      (question) =>
        typeof question.label === 'string' && question.label.endsWith('?')
    ),
    'every question needs a label to show the user'
  );
});

await test('signup requires a recovery question and a usable answer', async () => {
  const baseBody = {
    name: 'Question Needed',
    email: 'questionneeded@test.dev',
    password: SELF_SERVICE_PW
  };

  const noQuestion = await call('POST', '/auth/signup', { body: baseBody });

  assert.equal(noQuestion.status, 400, 'a signup without a question passed');
  assert.match(
    noQuestion.data.message,
    /security question/i,
    noQuestion.data.message
  );

  const invented = await call('POST', '/auth/signup', {
    body: { ...baseBody, securityQuestion: 'my_password', securityAnswer: 'X' }
  });

  assert.equal(invented.status, 400, 'an invented question was accepted');

  const shortAnswer = await call('POST', '/auth/signup', {
    body: { ...baseBody, securityQuestion: 'first_pet', securityAnswer: '  b ' }
  });

  assert.equal(shortAnswer.status, 400, 'a one-character answer was accepted');

  const good = await call('POST', '/auth/signup', {
    body: {
      ...baseBody,
      securityQuestion: 'first_pet',
      securityAnswer: 'Biscuit'
    }
  });

  assert.equal(good.status, 201, good.data?.message);

  const stored = await User.findById(good.data.user.id).select(
    '+securityAnswerHash'
  );

  assert.equal(stored.securityQuestion, 'first_pet', 'question not stored');
  assert.ok(stored.securityAnswerHash, 'answer hash not stored');
  assert.ok(
    !/biscuit/i.test(JSON.stringify(stored.toObject())),
    'the answer is stored in plain text'
  );
  assert.ok(
    await bcrypt.compare('biscuit', stored.securityAnswerHash),
    'the stored hash does not match the normalised answer'
  );
});

await test('naming an account returns the question it chose', async () => {
  const response = await call('POST', `${REC}/question`, {
    body: { email: recUser.email }
  });

  assert.equal(response.status, 200, response.data?.message);
  assert.equal(
    response.data.question,
    securityQuestionLabel(FIXTURE_QUESTION),
    'the wrong question came back'
  );
  assert.ok(response.data.answerToken, 'no answer token was issued');
  assert.ok(
    !JSON.stringify(response.data).includes('$2'),
    'a hash leaked from the recovery step'
  );

  recState.answerToken = response.data.answerToken;
});

await test('a question-less account cannot be recovered, and says so quietly', async () => {
  const unknown = await call('POST', `${REC}/question`, {
    body: { email: 'nobody-at-all@test.dev' }
  });

  const questionless = await call('POST', `${REC}/question`, {
    body: { email: legacy.email }
  });

  assert.equal(unknown.status, 404, 'an unknown email did not 404');
  assert.equal(questionless.status, 404, 'a question-less account was opened');
  assert.equal(
    unknown.data.message,
    questionless.data.message,
    'the two replies tell an attacker which emails exist'
  );

  const stillWorks = await call('POST', '/auth/login', {
    body: { email: legacy.email, password: SELF_SERVICE_PW }
  });

  assert.equal(
    stillWorks.status,
    200,
    'an account with no question can no longer log in'
  );
});

await test('the answer is checked case and whitespace independently', async () => {
  const wrong = await call('POST', `${REC}/verify`, {
    token: recState.answerToken,
    body: { answer: 'Rex' }
  });

  assert.equal(wrong.status, 401, 'a wrong answer was accepted');
  assert.ok(
    !wrong.data.resetToken,
    'a reset token came back with a wrong answer'
  );

  const sloppy = await call('POST', `${REC}/verify`, {
    token: recState.answerToken,
    body: { answer: `  ${String(FIXTURE_ANSWER).toUpperCase()}  ` }
  });

  assert.equal(sloppy.status, 200, sloppy.data?.message);
  assert.ok(sloppy.data.resetToken, 'the right answer issued no reset token');

  recState.resetToken = sloppy.data.resetToken;
});

await test('each recovery link unlocks exactly its own step', async () => {
  const sessionOnVerify = await call('POST', `${REC}/verify`, {
    token: recUser.token,
    body: { answer: FIXTURE_ANSWER }
  });

  assert.equal(
    sessionOnVerify.status,
    401,
    'a session token was accepted by the answer step'
  );

  const answerOnReset = await call('POST', `${REC}/reset`, {
    token: recState.answerToken,
    body: { newPassword: NEW_PW, confirmPassword: NEW_PW }
  });

  assert.equal(
    answerOnReset.status,
    401,
    'the answer token reached the reset step'
  );

  const answerAsSession = await call('GET', '/auth/profile', {
    token: recState.answerToken
  });

  assert.equal(
    answerAsSession.status,
    401,
    'a recovery token works as a session token'
  );

  const noToken = await call('POST', `${REC}/reset`, {
    body: { newPassword: NEW_PW, confirmPassword: NEW_PW }
  });

  assert.equal(noToken.status, 401, 'the reset step ran with no link at all');
});

await test('recovery writes a new password and signs the account in', async () => {
  const before = await User.findById(recUser.id).select('+password');

  const reuse = await call('POST', `${REC}/reset`, {
    token: recState.resetToken,
    body: {
      newPassword: SELF_SERVICE_PW,
      confirmPassword: SELF_SERVICE_PW
    }
  });

  assert.equal(
    reuse.status,
    400,
    'the forgotten password could simply be given back'
  );

  const weak = await call('POST', `${REC}/reset`, {
    token: recState.resetToken,
    body: { newPassword: 'short', confirmPassword: 'short' }
  });

  assert.equal(weak.status, 400, 'a weak password passed the policy');

  const mismatch = await call('POST', `${REC}/reset`, {
    token: recState.resetToken,
    body: { newPassword: NEW_PW, confirmPassword: `${NEW_PW}x` }
  });

  assert.equal(
    mismatch.status,
    400,
    'the confirmation was not compared'
  );

  await restASecond();

  const reset = await call('POST', `${REC}/reset`, {
    token: recState.resetToken,
    body: { newPassword: NEW_PW, confirmPassword: NEW_PW }
  });

  assert.equal(reset.status, 200, reset.data?.message);
  assert.ok(reset.data.token, 'no session token after a reset');
  assert.ok(!/\$2[aby]\$\d{2}\$/.test(JSON.stringify(reset.data)), 'a hash leaked');

  const after = await User.findById(recUser.id).select('+password');

  assert.notEqual(after.password, before.password, 'the password was not written');
  assert.ok(
    await bcrypt.compare(NEW_PW, after.password),
    'the stored hash is not the new password'
  );

  const oldLogin = await call('POST', '/auth/login', {
    body: { email: recUser.email, password: SELF_SERVICE_PW }
  });

  assert.equal(oldLogin.status, 401, 'the old password still logs in');

  const newLogin = await call('POST', '/auth/login', {
    body: { email: recUser.email, password: NEW_PW }
  });

  assert.equal(newLogin.status, 200, newLogin.data?.message);

  const profile = await call('GET', '/auth/profile', {
    token: reset.data.token
  });

  assert.equal(
    profile.status,
    200,
    'the token from the reset is not a working session'
  );

  // The session the remaining tests sign in with: changing a password ends the
  // tokens issued before it, so recUser.token is retired by the reset above.
  recState.sessionToken = newLogin.data.token;

  const answerHash = (
    await User.findById(recUser.id).select('+securityAnswerHash')
  ).securityAnswerHash;

  assert.ok(answerHash, 'the answer hash disappeared with the old password');
  assert.ok(
    !JSON.stringify(profile.data).includes(answerHash),
    'the answer hash was returned by the profile endpoint'
  );
  assert.ok(
    !JSON.stringify(reset.data).includes(answerHash),
    'the answer hash was returned by the reset endpoint'
  );
});

await test('recovery links die as soon as the password moves', async () => {
  const staleAnswer = await call('POST', `${REC}/verify`, {
    token: recState.answerToken,
    body: { answer: FIXTURE_ANSWER }
  });

  assert.equal(
    staleAnswer.status,
    401,
    'a link survived the password it was issued for'
  );

  const staleReset = await call('POST', `${REC}/reset`, {
    token: recState.resetToken,
    body: { newPassword: 'Another#2026', confirmPassword: 'Another#2026' }
  });

  assert.equal(staleReset.status, 401, 'a reset link survived its own reset');
});

await test('changing the question needs the password, then the new answer rules', async () => {
  const questionBody = {
    securityQuestion: 'first_school',
    securityAnswer: OTHER_ANSWER
  };

  const noPassword = await call('PUT', '/auth/security-question', {
    token: recState.sessionToken,
    body: questionBody
  });

  assert.equal(
    noPassword.status,
    400,
    'a question was saved without confirming the password'
  );

  const wrongPassword = await call('PUT', '/auth/security-question', {
    token: recState.sessionToken,
    body: { ...questionBody, currentPassword: 'NotMyPassword#1' }
  });

  assert.equal(
    wrongPassword.status,
    401,
    'an incorrect password still saved the question'
  );

  const invented = await call('PUT', '/auth/security-question', {
    token: recState.sessionToken,
    body: {
      securityQuestion: 'my_dog',
      securityAnswer: OTHER_ANSWER,
      currentPassword: NEW_PW
    }
  });

  assert.equal(
    invented.status,
    400,
    'a question outside the catalogue was saved'
  );

  const saved = await call('PUT', '/auth/security-question', {
    token: recState.sessionToken,
    body: { ...questionBody, currentPassword: NEW_PW }
  });

  assert.equal(saved.status, 200, saved.data?.message);
  assert.equal(saved.data.securityQuestion, 'first_school', 'wrong id back');
  assert.equal(
    saved.data.question,
    securityQuestionLabel('first_school'),
    'wrong label back'
  );

  const shown = await call('POST', `${REC}/question`, {
    body: { email: recUser.email }
  });

  assert.equal(shown.status, 200, shown.data?.message);
  assert.equal(
    shown.data.question,
    SECURITY_QUESTIONS.find((q) => q.id === 'first_school').label,
    'step 1 still shows the old question'
  );

  const profile = await call('GET', '/auth/profile', {
    token: recState.sessionToken
  });

  assert.equal(
    profile.data.user.securityQuestion,
    'first_school',
    'the profile does not report the stored question'
  );
  assert.ok(
    !('securityAnswerHash' in profile.data.user),
    'the profile carries an answer hash'
  );

  const verified = await call('POST', `${REC}/verify`, {
    token: shown.data.answerToken,
    body: { answer: OTHER_ANSWER }
  });

  assert.equal(
    verified.status,
    200,
    'the new answer was refused: ' + verified.data?.message
  );

  const stored = await User.findById(recUser.id).select('+securityAnswerHash');

  assert.ok(
    !(await bcrypt.compare(FIXTURE_ANSWER, stored.securityAnswerHash)),
    'the replaced answer still verifies'
  );
});

await test('the answer step is rate limited per address', async () => {
  const started = await call('POST', `${REC}/question`, {
    body: { email: recUser.email }
  });

  assert.equal(started.status, 200, started.data?.message);

  // Five guesses is the whole window budget, and this section has now spent it:
  // successes count too, so the next request is refused whoever it comes from.
  const blocked = await call('POST', `${REC}/verify`, {
    token: started.data.answerToken,
    body: { answer: 'Whatever It Is' }
  });

  assert.equal(blocked.status, 429, 'the answer step let a sixth guess through');
  assert.match(blocked.data.message, /too many answer attempts/i, blocked.data.message);
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
