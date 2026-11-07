import mongoose from 'mongoose';

// Badge definitions. Seeded from config/xpRules.js on boot and editable by
// admins afterwards, which is what makes "managing badges" a real feature
// rather than a code change.
const achievementSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_]+$/, 'Slug may only contain lowercase letters, numbers and underscores']
    },

    title: { type: String, required: true, trim: true, maxlength: 80 },

    description: { type: String, required: true, trim: true, maxlength: 300 },

    // Lucide icon name resolved on the client. Unknown names fall back to a
    // default rather than crashing the profile grid.
    icon: { type: String, default: 'Award', trim: true, maxlength: 40 },

    metric: {
      type: String,
      required: true,
      enum: [
        'eventsAttended',
        'activeWeeks',
        'competitionEntries',
        'competitionWins',
        'volunteerCredits',
        'eventsOrganized',
        'clubsLed',
        'totalXp',
        'badgesEarned'
      ]
    },

    // Value of `metric` needed to unlock.
    threshold: { type: Number, required: true, min: 1, max: 100000 },

    // Granted as an achievement_bonus transaction on unlock. 0 keeps the badge
    // purely cosmetic.
    xpBonus: { type: Number, default: 0, min: 0, max: 5000 },

    active: { type: Boolean, default: true },

    sortOrder: { type: Number, default: 100 }
  },
  { timestamps: true }
);

achievementSchema.index({ active: 1, sortOrder: 1 });

export default mongoose.model('Achievement', achievementSchema);
