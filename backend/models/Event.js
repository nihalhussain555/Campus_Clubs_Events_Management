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
      required: [true, 'Please provide an event date']
    },

    endDate: {
      type: Date,
      default: null
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

    // Students registered for the event
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

    // Students who received certificates
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
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Event', eventSchema);