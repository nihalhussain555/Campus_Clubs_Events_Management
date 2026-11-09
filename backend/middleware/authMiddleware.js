import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/env.js';

export const ROLES = {
  STUDENT: 'student',
  CLUB_LEADER: 'club_leader',
  ADMIN: 'admin',
};

// The pre-existing enum also contained 'club_member'. Stored users keep their
// role values, so legacy club_member is mapped onto student permissions rather
// than migrated.
const EFFECTIVE_ROLE = {
  student: ROLES.STUDENT,
  club_member: ROLES.STUDENT,
  club_leader: ROLES.CLUB_LEADER,
  admin: ROLES.ADMIN,
};

export const normalizeRole = (role) => EFFECTIVE_ROLE[role] || ROLES.STUDENT;

// Marks the short-lived token issued when login detects an account that still
// has to choose its own password. It is signed with the same secret, so the
// purpose claim is what keeps it from being replayed as a session token.
export const PASSWORD_SETUP_PURPOSE = 'password_setup';

// Shared body for the "you must set a password first" rejection. 403 rather
// than 401 on purpose: the frontend interceptor logs users out on 401, and
// these accounts are not unauthenticated - they are authenticated but
// restricted.
const passwordSetupRequired = (res) =>
  res.status(403).json({
    code: 'PASSWORD_SETUP_REQUIRED',
    message:
      'You must set a new password before using the rest of the platform.'
  });

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const parts = authHeader.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

  return parts[1];
};

// A token issued before the account's password changed is a session that
// should no longer exist - the change itself, or an admin regenerating a
// temporary password. jwt iat has one-second resolution, so passwordChangedAt
// is stored truncated to the second (see authController) and any token from an
// earlier second is refused. The replacement token is signed in the same or a
// later second, so it always survives.
const isTokenRevoked = (decoded, user) => {
  if (!user.passwordChangedAt || typeof decoded.iat !== 'number') return false;
  return decoded.iat * 1000 < user.passwordChangedAt.getTime();
};

// =====================================================
// VERIFY TOKEN
// =====================================================
export const verifyToken = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Support both existing JWT payload shapes: { id } and { userId }.
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    if (decoded.purpose === PASSWORD_SETUP_PURPOSE) {
      return res.status(403).json({
        code: 'PASSWORD_SETUP_REQUIRED',
        message: 'Please complete your password setup first.'
      });
    }

    // The role inside the JWT is never trusted; it would go stale the moment
    // an admin changes someone's role.
    const user = await User.findById(userId).select(
      '_id name email role studentId profilePic department course ' +
      'mustChangePassword passwordChangedAt'
    );

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.mustChangePassword) {
      return passwordSetupRequired(res);
    }

    if (isTokenRevoked(decoded, user)) {
      return res.status(401).json({
        message: 'Session expired. Please log in again.'
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      effectiveRole: normalizeRole(user.role),
      studentId: user.studentId,
      profilePic: user.profilePic,
      department: user.department,
      course: user.course,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// =====================================================
// VERIFY PASSWORD SETUP TOKEN
// =====================================================
// Only unlocks the mandatory password-setup endpoint. Nothing else accepts this
// token, and verifyToken refuses it, so holding one grants no data access.
export const verifyPasswordSetupToken = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.purpose !== PASSWORD_SETUP_PURPOSE) {
      return res.status(401).json({
        message: 'This token cannot be used for password setup'
      });
    }

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // "+password" only: the setup flags are selected by default, and listing
    // plain fields next to a "+" path switches mongoose to inclusion mode.
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // An admin may regenerate or clear the requirement while this token is
    // still live; the setup link must then stop working.
    if (!user.mustChangePassword) {
      return res.status(401).json({
        message: 'Password setup is no longer required. Please log in again.'
      });
    }

    if (
      user.temporaryPasswordExpiresAt &&
      user.temporaryPasswordExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(401).json({
        message:
          'This temporary password has expired. Please ask an administrator ' +
          'to issue a new one.'
      });
    }

    req.passwordSetupUser = user;

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      effectiveRole: normalizeRole(user.role),
    };

    next();
  } catch (error) {
    console.error('Password setup authentication error:', error.message);
    return res.status(401).json({
      message: 'Invalid or expired setup token. Please log in again.'
    });
  }
};

// =====================================================
// ROLE GATES
// =====================================================
export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.effectiveRole !== ROLES.ADMIN) {
    return res
      .status(403)
      .json({ message: 'Access denied. Admin only.' });
  }

  next();
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!roles.includes(req.user.effectiveRole)) {
    return res.status(403).json({
      message: 'Access denied. Requires one of: ' + roles.join(', '),
    });
  }

  next();
};
