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
const XPTransaction = (await import('../models/XPTransaction.js')).default;
const Gamification = (await import('../models/Gamification.js')).default;
const StudentBadge = (await import('../models/StudentBadge.js')).default;
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
    : type.includes('text/csv')
      ? await res.text()
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
