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
