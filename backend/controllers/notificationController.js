import Notification from '../models/Notification.js';

// =====================================================
// GET MY NOTIFICATIONS
// =====================================================

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { user: req.user.id },
        { user: null }
      ]
    })
      .populate('event', 'title date location')
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter(
      notification => !notification.isRead
    ).length;

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
    const {
      user,
      title,
      message,
      type,
      event
    } = req.body;

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

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { user: req.user.id },
          { user: null }
        ]
      },
      {
        isRead: true
      },
      {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      notification
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
    await Notification.updateMany(
      {
        $or: [
          { user: req.user.id },
          { user: null }
        ],
        isRead: false
      },
      {
        isRead: true
      }
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