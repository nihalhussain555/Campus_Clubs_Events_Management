import mongoose from 'mongoose';

// Written alongside Event.participants rather than replacing it, so existing
// attendance data and existing reads keep working. This collection is the
// auditable record: who verified the check-in, when, and how.
const attendanceSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    method: {
      type: String,
      enum: ['qr_scan', 'roster'],
      required: true
    },

    checkedInAt: {
      type: Date,
      default: Date.now
    },

    // The admin or club leader who verified this attendance. Null only when a
    // student scans a valid registration token at a self-service kiosk.
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// One attendance row per student per event.
attendanceSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
