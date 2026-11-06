import express from 'express';

import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';

import {
  verifyToken,
  verifyAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Get logged-in user's notifications
router.get('/', verifyToken, getNotifications);

// Admin creates notification
router.post('/', verifyToken, verifyAdmin, createNotification);

// Mark all notifications as read
router.put('/read-all', verifyToken, markAllAsRead);

// Mark one notification as read
router.put('/:id/read', verifyToken, markAsRead);

// Dismiss a notification
router.delete('/:id', verifyToken, deleteNotification);

export default router;
