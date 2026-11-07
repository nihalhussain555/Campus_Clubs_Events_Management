import mongoose from 'mongoose';

// Per-user projection of the XP ledger: what the dashboard needs without
// re-reading every transaction row. Always written by the award path in the
// same operation that inserts the transaction, and rebuildable from scratch by
// the admin recompute endpoint if it is ever found disagreeing.
const gamificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    totalXp: { type: Number, default: 0 },

    // Lifetime XP and award counts keyed by transaction type, e.g.
    // { xp: { event_attendance: 40 }, counts: { event_attendance: 4 } }.
    xpByType: { type: Map, of: Number, default: {} },
    countsByType: { type: Map, of: Number, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model('Gamification', gamificationSchema);
