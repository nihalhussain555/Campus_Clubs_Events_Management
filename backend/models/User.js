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
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);
