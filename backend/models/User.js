import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    // The previous pattern required a 2-3 character TLD, which rejected valid
    // addresses on longer TLDs (.education, .company, .technology).
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'club_member', 'club_leader'],
    default: 'student'
  },
  studentId: { type: String, trim: true },
  personalEmail: { type: String, lowercase: true, trim: true },
  department: { type: String, trim: true },
  year: { type: String, trim: true },
  semester: { type: String, trim: true },
  course: { type: String, trim: true },
  section: { type: String, trim: true },
  bio: { type: String, trim: true, maxlength: 500 },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  dob: { type: Date },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  profilePic: { type: String },
  joinedClubs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club'
    }
  ],
  // The in-app calendar. Adding an event from the Events or Calendar page
  // records the reference here instead of downloading an .ics, so the same
  // student sees the same plan on every device. The Event collection stays the
  // single source of truth for the details themselves.
  calendarEvents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    }
  ],

  // Day notes, previously localStorage-only and lost on any other browser.
  calendarNotes: [
    {
      day: { type: Number, required: true, min: 1, max: 31 },
      month: { type: Number, required: true, min: 0, max: 11 },
      year: { type: Number, required: true, min: 1970, max: 9999 },
      text: { type: String, required: true, trim: true, maxlength: 240 }
    }
  ],

  // Saved off-campus listings. A reference only: saving an external event does
  // not register anyone anywhere, because that still happens on the organiser's
  // own site. Same shape and limits as calendarEvents above.
  bookmarkedExternalEvents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalEvent'
    }
  ],

  registeredEvents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    }
  ],
  certificates: [
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    certificateId: {
      type: String,
      unique: true,
      sparse: true
    }
  }
],

  // Read by AccountSettings. Defaults live in the schema so the toggles
  // round-trip instead of being stripped by strict mode.
  pushNotifications: { type: Boolean, default: true },
  eventReminders: { type: Boolean, default: true },
  membershipAlerts: { type: Boolean, default: true },

  // ---------------- Account setup / temporary credentials ----------------
  // Defaults are all "nothing special" so every record that predates this
  // feature keeps logging in exactly as before: a missing flag reads as false
  // and an absent expiry reads as "no temporary password pending".
  isFirstLogin: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: false },

  // Truncated to the second because JWT iat claims carry no sub-second
  // precision: verifyToken compares the two to decide whether a token predates
  // the last password change, and an untruncated value would revoke the token
  // issued in the very same second.
  passwordChangedAt: {
    type: Date,
    default: () => new Date(Math.floor(Date.now() / 1000) * 1000)
  },

  // Set only while an admin-issued temporary password is outstanding. The
  // plaintext itself is never stored - only its bcrypt hash in `password`.
  temporaryPasswordExpiresAt: { type: Date, default: null },

  createdAt: {
    type: Date,
    default: Date.now
  }

  
});

// The leaderboard filters and ranks by department, and every ranking query
// starts from the set of students in one role.
userSchema.index({ department: 1 });
userSchema.index({ role: 1, department: 1 });

// True while an admin-issued temporary password is still usable. Records that
// predate the field have no expiry, so they are treated as ordinary accounts
// rather than locked ones.
userSchema.methods.hasActiveTemporaryPassword = function () {
  if (!this.temporaryPasswordExpiresAt) return false;
  return this.temporaryPasswordExpiresAt.getTime() > Date.now();
};

export default mongoose.model('User', userSchema);
