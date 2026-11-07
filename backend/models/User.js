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

  createdAt: {
    type: Date,
    default: Date.now
  }

  
});

// The leaderboard filters and ranks by department, and every ranking query
// starts from the set of students in one role.
userSchema.index({ department: 1 });
userSchema.index({ role: 1, department: 1 });

export default mongoose.model('User', userSchema);
