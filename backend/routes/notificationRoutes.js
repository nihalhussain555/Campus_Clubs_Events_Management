import express from 'express';
import { getNotifications, createNotification } from '../controllers/notificationController.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getNotifications)
  .post(verifyAdmin, createNotification);

export default router;
