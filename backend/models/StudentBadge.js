import mongoose from 'mongoose';

// The award record for one student and one badge. The catalog lives in
// Achievement so this stays a thin join that can also hold the metric value
// that triggered the unlock, which is what makes "why did I get this?" answerable.
const studentBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true
    },

    slug: { type: String, required: true, index: true },

    metricValue: { type: Number, default: 0 },

    earnedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// One badge per student per achievement.
studentBadgeSchema.index({ user: 1, achievement: 1 }, { unique: true });

export default mongoose.model('StudentBadge', studentBadgeSchema);
