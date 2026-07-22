import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a notification title'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Please provide a notification message']
  },
  type: {
    type: String,
    enum: ['info', 'alert', 'event'],
    default: 'info'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Notification', notificationSchema);
