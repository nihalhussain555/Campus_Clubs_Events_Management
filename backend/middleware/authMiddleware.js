import jwt from 'jsonwebtoken';

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

export const verifyToken = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production'
    );

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    return res.status(403).json({ message: 'Access denied. Admin only.' });
  });
};

export const verifyStudent = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'student') {
      return next();
    }

    return res.status(403).json({ message: 'Access denied. Students only.' });
  });
};
