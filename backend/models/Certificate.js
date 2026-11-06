import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },

    studentName: {
      type: String,
      required: true
    },

    eventName: {
      type: String,
      required: true
    },

    eventDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    location: {
      type: String,
      default: 'TBD'
    },

    clubName: {
      type: String,
      default: 'Campus Club'
    },

    category: {
      type: String,
      default: 'General'
    },

    issuedAt: {
      type: Date,
      default: Date.now
    },

    qrToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    verified: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// One certificate per student per event. The app-level findOne guard in
// issueCertificate is a race, so the database enforces it too.
certificateSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model('Certificate', certificateSchema);