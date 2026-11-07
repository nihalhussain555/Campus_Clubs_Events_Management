import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  clubName: {
    type: String,
    required: [true, 'Please provide a club name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },

  // Optional branding for the club leaderboard. Older records simply render
  // their initials, so nothing needs migrating.
  logo: { type: String, trim: true },

  department: { type: String, trim: true },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Club', clubSchema);
