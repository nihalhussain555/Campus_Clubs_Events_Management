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

    // START DATE + TIME
    date: {
      type: Date,
      required: [true, 'Please provide an event start date']
    },

    // END DATE + TIME
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

    // Drives which XP award a verified attendance row produces. Defaults to a
    // plain event, so records created before gamification keep scoring the
    // standard attendance amount.
    activityType: {
      type: String,
      enum: ['event', 'competition', 'workshop', 'volunteering'],
      default: 'event'
    },

    // Set once the organising credit has been paid out, so the +30 award for
    // running an event cannot be claimed twice by an impatient club leader.
    organizerCreditedAt: {
      type: Date,
      default: null
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    },

    registeredStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

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

    // Stamped by the reminder sweep the moment the pre-start notification is
    // handed out. Claiming the slot with a conditional write is what keeps a
    // restart, or a second Render instance, from notifying the same crowd
    // twice. Moving the event's date clears it so the new time still warns.
    reminderSentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// The reminder sweep reads a date window and skips events it has already
// notified, so both fields belong in one index.
eventSchema.index({ date: 1, reminderSentAt: 1 });

export default mongoose.model('Event', eventSchema);