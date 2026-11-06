import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

const toUserId = (id) => new mongoose.Types.ObjectId(String(id));

// Broadcast rows share one document, so read state is derived per recipient.
// Direct rows keep using their own isRead flag.
const serializeFor = (notification, userId) => {
  const plain = notification.toObject();

  plain.isRead = plain.user
    ? Boolean(plain.isRead)
    : plain.readBy.some((read) => read.toString() === String(userId));

  delete plain.readBy;

  return plain;
};

// =====================================================
// GET MY NOTIFICATIONS
// =====================================================

export const getNotifications = async (req, res) => {
  try {
    const found = await Notification.find({
      $or: [{ user: req.user.id }, { user: null }]
    })
      .populate('event', 'title date location')
      .sort({ createdAt: -1 });

    const notifications = found.map((n) =>
      serializeFor(n, req.user.id)
    );

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to load notifications',
      error: error.message
    });
  }
};

// =====================================================
// CREATE NOTIFICATION
// =====================================================

export const createNotification = async (req, res) => {
  try {
    const { user, title, message, type, event } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notification = await Notification.create({
      user: user || null,
      title,
      message,
      type: type || 'info',
      event: event || null
    });

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Create notification error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

const findReadable = (userId) => ({
  $or: [{ user: userId }, { user: null }]
});

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      ...findReadable(req.user.id)
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const uid = toUserId(req.user.id);

    if (notification.user) {
      notification.isRead = true;
    } else if (!notification.readBy.some((read) => read.equals(uid))) {
      notification.readBy.push(uid);
    }

    await notification.save();

    res.status(200).json({
      success: true,
      notification: serializeFor(notification, req.user.id)
    });
  } catch (error) {
    console.error('Mark notification read error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// =====================================================
// MARK ALL AS READ
// =====================================================

export const markAllAsRead = async (req, res) => {
  try {
    const uid = toUserId(req.user.id);

    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    // Only append the recipient to broadcasts they have not read yet.
    await Notification.updateMany(
      { user: null, readBy: { $ne: uid } },
      { $addToSet: { readBy: uid } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
};

// =====================================================
// DELETE NOTIFICATION
// =====================================================

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // A user may dismiss their own direct notification; removing a campus-wide
    // broadcast affects everyone, so that stays admin-only.
    const isOwner =
      notification.user && notification.user.toString() === req.user.id;

    if (!isOwner && req.user.effectiveRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot delete this notification.'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
      id: req.params.id
    });
  } catch (error) {
    console.error('Delete notification error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};
