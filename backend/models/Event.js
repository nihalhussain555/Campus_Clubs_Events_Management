import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true
    },

    description: {
      type: String,
      required: [true, 'Please provide an event description'],
      trim: true
    },

    date: {
      type: Date,
      required: [true, 'Please provide an event start date']
    },

    // NEW
    endDate: {
      type: Date,
      required: [true, 'Please provide an event end date']
    },

    location: {
      type: String,
      default: 'TBD',
      trim: true
    },

    category: {
      type: String,
      default: 'General',
      trim: true
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    },

    // Students who registered
    registeredStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // Students who actually attended
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // Students whose certificates were generated
    certificateRecipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    capacity: {
      type: Number,
      default: 100,
      min: 1
    },

    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming'
    },

    certificateEnabled: {
      type: Boolean,
      default: true
    },

    certificateIssuedAt: {
      type: Date,
      default: null
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Event', eventSchema);