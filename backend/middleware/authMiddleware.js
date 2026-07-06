import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
  });
};

export const verifyStudent = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'student') {
      next();
    } else {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }
  });
};
