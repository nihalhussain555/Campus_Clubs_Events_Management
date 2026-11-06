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

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const parts = authHeader.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

  return parts[1];
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

    // The role inside the JWT is never trusted; it would go stale the moment
    // an admin changes someone's role.
    const user = await User.findById(userId).select(
      '_id name email role studentId profilePic department course'
    );

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
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
