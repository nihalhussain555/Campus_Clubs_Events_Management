import mongoose from 'mongoose';

// The append-only ledger of every point movement. Rankings are aggregated from
// this collection rather than from a counter that can silently drift, so an
// audit of a student's score is always possible from the rows alone.
const xpTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Denormalised from Event.club so club standings can be aggregated without
    // a lookup back through every event. Null for awards with no club context
    // (a campus-wide manual adjustment, for example).
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null
    },

    type: {
      type: String,
      enum: [
        'event_attendance',
        'competition_participation',
        'competition_win',
        'volunteering',
        'event_organizing',
        'workshop_completion',
        'achievement_bonus',
        'manual_adjustment'
      ],
      required: true
    },

    // Negative for deductions and reversals. Stored rather than derived from
    // `type` because a manual adjustment can go either way.
    amount: {
      type: Number,
      required: true,
      min: -5000,
      max: 5000
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 400
    },

    // The organiser or admin who caused this row. Null when the award came from
    // an automatic attendance verification.
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    source: {
      type: String,
      enum: ['automatic', 'admin', 'backfill'],
      default: 'automatic'
    },

    // Deterministic for automatic awards (`attendance:<attendanceId>`), so two
    // concurrent check-ins of the same row collapse into one unique-index
    // violation instead of double-paying. Random for deliberate manual awards,
    // which are meant to be repeatable.
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    // Set when this row exists to undo another one.
    reverses: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'XPTransaction',
      default: null
    },

    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'XPTransaction',
      default: null
    },

    achievement: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Leaderboard windows scan by date, then group by student or club.
xpTransactionSchema.index({ createdAt: 1, user: 1 });
xpTransactionSchema.index({ user: 1, createdAt: -1 });
xpTransactionSchema.index({ club: 1, createdAt: -1 });
xpTransactionSchema.index({ user: 1, type: 1 });
xpTransactionSchema.index({ event: 1, type: 1 });

export default mongoose.model('XPTransaction', xpTransactionSchema);
