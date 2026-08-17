import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    title: {
      type: String,
      required: [true, 'Please provide a notification title'],
      trim: true
    },

    message: {
      type: String,
      required: [true, 'Please provide a notification message'],
      trim: true
    },

    type: {
      type: String,
      enum: [
        'registration',
        'reminder',
        'cancellation',
        'certificate',
        'event',
        'club',
        'alert',
        'info'
      ],
      default: 'info'
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Notification', notificationSchema);