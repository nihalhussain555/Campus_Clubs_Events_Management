import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// =====================================================
// VERIFY TOKEN
// =====================================================
export const verifyToken = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // IMPORTANT:
    // Do NOT trust the role stored inside the old JWT.
    // Get the latest role directly from MongoDB.
    const user = await User.findById(decoded.id).select(
      '_id name email role studentId profilePic'
    );

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists'
      });
    }

    // Always use the CURRENT MongoDB role
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      profilePic: user.profilePic
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

// =====================================================
// VERIFY ADMIN
// =====================================================
export const verifyAdmin = async (req, res, next) => {
  try {
    // verifyToken has already loaded the latest user
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Admin only.'
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Admin verification failed'
    });
  }
};

// =====================================================
// VERIFY STUDENT
// =====================================================
export const verifyStudent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({
        message: 'Access denied. Students only.'
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Student verification failed'
    });
  }
};