import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

const ISSUER = 'campus-clubs-checkin';

// A registration check-in QR is a short-lived signed token bound to one
// (student, event) pair. Stateless, so nothing to migrate or expire in the DB:
// an old QR stops working by itself.
export const signCheckinToken = (eventId, userId) =>
  jwt.sign(
    { eventId: String(eventId), userId: String(userId) },
    JWT_SECRET,
    { issuer: ISSUER, expiresIn: '12h' }
  );

export const verifyCheckinToken = (token, eventId) => {
  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET, { issuer: ISSUER });
  } catch {
    return { valid: false, reason: 'QR code is invalid or has expired.' };
  }

  if (decoded.eventId !== String(eventId)) {
    return { valid: false, reason: 'This QR code belongs to a different event.' };
  }

  return { valid: true, userId: decoded.userId };
};
