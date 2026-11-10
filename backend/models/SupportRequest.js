import mongoose from 'mongoose';

// The taxonomy is shared with the frontend form, so it lives with the schema
// and is exported rather than repeated in two places.
export const SUPPORT_CATEGORIES = [
  'account',
  'clubs',
  'events',
  'certificates',
  'leaderboard',
  'technical',
  'feedback'
];

export const SUPPORT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const supportRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    subject: {
      type: String,
      required: [true, 'A subject is required'],
      trim: true,
      minlength: [3, 'Describe the issue in a few words'],
      maxlength: [120, 'Keep the subject under 120 characters']
    },

    category: {
      type: String,
      required: [true, 'Choose an issue category'],
      enum: {
        values: SUPPORT_CATEGORIES,
        message: 'Choose one of the listed categories'
      },
      index: true
    },

    description: {
      type: String,
      required: [true, 'A description is required'],
      trim: true,
      minlength: [10, 'Please add a little more detail'],
      maxlength: [2000, 'Keep the description under 2000 characters']
    },

    status: {
      type: String,
      enum: {
        values: SUPPORT_STATUSES,
        message: 'Choose one of the listed statuses'
      },
      default: 'open',
      index: true
    },

    adminResponse: {
      type: String,
      trim: true,
      maxlength: [2000, 'Keep the reply under 2000 characters'],
      default: ''
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    respondedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// The admin queue is always read newest-first.
supportRequestSchema.index({ createdAt: -1 });

export default mongoose.model('SupportRequest', supportRequestSchema);
