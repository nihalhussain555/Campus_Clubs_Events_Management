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
        'achievement',
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
    },

    // Broadcast rows (user: null) are a single shared document, so a lone
    // isRead flag would let the first reader mark it read for the whole
    // campus. Per-recipient read state lives here instead.
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Notification', notificationSchema);