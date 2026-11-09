import User from '../models/User.js';
import Club from '../models/Club.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  TEMP_PASSWORD_TTL_HOURS,
  PASSWORD_SETUP_TOKEN_TTL
} from '../config/env.js';
import {
  normalizeRole,
  PASSWORD_SETUP_PURPOSE
} from '../middleware/authMiddleware.js';
import {
  isStrongPassword,
  PASSWORD_REQUIREMENT_TEXT
} from '../utils/passwordPolicy.js';
import { generateTemporaryPassword } from '../utils/tempPassword.js';
import { audit } from '../services/auditService.js';

const generateToken = (id, role) => {
  return jwt.sign(
    {
      id: id.toString(),
      role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
};

// Grants access to the password-setup endpoint and nothing else.
const generateSetupToken = (id, role) => {
  return jwt.sign(
    {
      id: id.toString(),
      role,
      purpose: PASSWORD_SETUP_PURPOSE
    },
    JWT_SECRET,
    {
      expiresIn: PASSWORD_SETUP_TOKEN_TTL
    }
  );
};

// Must match the truncation the schema default applies, for the reason noted
// there: verifyToken compares this against the token's iat.
const secondAlignedTimestamp = () =>
  new Date(Math.floor(Date.now() / 1000) * 1000);

// The user object handed to the frontend after a successful login or signup.
// Kept as a helper because the shape is duplicated across three endpoints and
// a missing field silently resets part of the stored session.
const authUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId,
  department: user.department,
  course: user.course,
  phone: user.phone,
  gender: user.gender,
  address: user.address,
  year: user.year,
  section: user.section,
  semester: user.semester,
  dob: user.dob,
  profilePic: user.profilePic,
  createdAt: user.createdAt
});

// =====================================================
// USER SIGNUP
// =====================================================
export const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      department,
      course,
      phone,
      gender,
      address,
      year,
      section,
      semester,
      dob
    } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Please provide all required fields'
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENT_TEXT });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // SECURITY:
    // New users should always be students.
    // Admin role should be assigned separately.
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'student',
      studentId,
      department,
      course,
      phone,
      address,
      year,
      section,
      semester
    };

    if (gender) {
      userData.gender = gender;
    }

    if (dob) {
      userData.dob = dob;
    }

    const user = new User(userData);

    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'User registered successfully',

      token,

      user: authUserPayload(user)
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((field) => field.message)
          .join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// USER LOGIN
// =====================================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Objects survive a falsy check, so the types are verified here rather
    // than letting a stripped operator payload reach toLowerCase().
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Please provide email and password'
      });
    }

    // Only `password` needs opting in; the setup flags are selected by
    // default, and adding plain field names alongside "+password" would switch
    // the query to inclusion mode and silently drop name, email and role.
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      audit('login_failed', { email: user.email, role: user.role });
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // A temporary password is only a door to the setup page. Once it lapses
    // the hash still matches, so the expiry has to be enforced here rather
    // than relying on the credential being wrong.
    if (
      user.mustChangePassword &&
      user.temporaryPasswordExpiresAt &&
      user.temporaryPasswordExpiresAt.getTime() <= Date.now()
    ) {
      audit('temp_password_expired', {
        userId: user._id,
        email: user.email,
        role: user.role
      });
      return res.status(401).json({
        message:
          'This temporary password has expired. Please ask an administrator ' +
          'to generate a new one.'
      });
    }

    // MANDATORY SETUP: no session token is issued. The restricted token below
    // can only reach the password-setup endpoint, and verifyToken rejects it
    // outright, so there is nothing to replay against the rest of the API.
    if (user.mustChangePassword) {
      audit('password_setup_required', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      return res.status(200).json({
        message: 'Temporary password accepted. Please set a new password.',
        passwordSetupRequired: true,
        setupToken: generateSetupToken(user._id, user.role),
        email: user.email,
        name: user.name,
        role: user.role,
        temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt || null
      });
    }

    // IMPORTANT:
    // Get role directly from MongoDB
    const currentRole = user.role;

    // Generate a fresh token using the current role
    const token = generateToken(
      user._id,
      currentRole
    );

    // First successful login with a self-chosen password clears the flag, so
    // the profile can report real activity instead of an always-true value.
    if (user.isFirstLogin) {
      user.isFirstLogin = false;
      await user.save();
    }

    audit('login_success', {
      userId: user._id,
      email: user.email,
      role: currentRole
    });

    res.status(200).json({
      message: 'Login successful',

      token,

      user: authUserPayload(user)
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// GET USER PROFILE
// =====================================================
// The profile backs three screens at once - the profile page, account settings
// and the edit modal - and each writes the response straight back into its own
// state. One shared shape is what stops a save from silently dropping a
// leader's clubs or a toggle the user just set.
const profilePayload = async (user) => {
  // A leader's identity is defined by the clubs that name them as admin, so the
  // profile can show what they run instead of only the role string.
  const ledClubs = await Club.find({ admin: user._id })
    .select('clubName category department members logo')
    .sort({ clubName: 1 })
    .lean();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    effectiveRole: normalizeRole(user.role),

    studentId: user.studentId,
    personalEmail: user.personalEmail,

    department: user.department,
    year: user.year,
    semester: user.semester,
    course: user.course,
    section: user.section,

    bio: user.bio,
    gender: user.gender,
    dob: user.dob,
    phone: user.phone,
    address: user.address,

    profilePic: user.profilePic,

    // Read by the account settings toggles. Without them the switches fall back
    // to "on" and a saved preference looks unset.
    pushNotifications: user.pushNotifications,
    eventReminders: user.eventReminders,
    membershipAlerts: user.membershipAlerts,

    joinedClubs: user.joinedClubs || [],
    registeredEvents: user.registeredEvents || [],

    // Serialised flat: a profile never needs another club's member list, only
    // how many members it has.
    ledClubs: ledClubs.map((club) => ({
      _id: club._id,
      clubName: club.clubName,
      category: club.category,
      department: club.department,
      memberCount: (club.members || []).length,
      logo: club.logo
    })),

    createdAt: user.createdAt
  };
};

export const getUserProfile = async (req, res) => {
  try {
    // req.user.id comes from verifyToken
    const user = await User.findById(req.user.id)
      .populate('joinedClubs')
      .populate('registeredEvents');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.status(200).json({
      user: await profilePayload(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// UPDATE USER PROFILE
// =====================================================

// Self-service profile fields only. Anything relationship- or privilege-bearing
// (role, email, joinedClubs, registeredEvents, certificates) is server-managed,
// because a student could otherwise write themselves into any club by posting
// the field directly instead of calling joinClub.
const EDITABLE_PROFILE_FIELDS = [
  'name',
  'studentId',
  'personalEmail',
  'department',
  'year',
  'semester',
  'course',
  'section',
  'bio',
  'gender',
  'dob',
  'phone',
  'address',
  'profilePic',
  'pushNotifications',
  'eventReminders',
  'membershipAlerts'
];

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const updates = {};

    for (const field of EDITABLE_PROFILE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }

    if (updates.profilePic !== undefined && updates.profilePic !== '') {
      const pic = String(updates.profilePic);
      const isInlineImage = /^data:image\/(png|jpe?g|webp);base64,/i.test(pic);
      const isRemoteImage = /^https?:\/\/\S+$/i.test(pic);

      if (!isInlineImage && !isRemoteImage) {
        return res.status(400).json({
          message: 'Profile picture must be a PNG, JPG or WEBP image'
        });
      }

      // Inline images live on the user document, so they are capped well below
      // the request body limit instead of letting a client fill the database.
      if (isInlineImage && pic.length > 1_000_000) {
        return res.status(413).json({
          message: 'Profile picture is too large. Please choose a smaller image.'
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No editable profile fields were provided'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: updates
      },
      {
        new: true,
        runValidators: true
      }
    )
      .select('-password')
      .populate('joinedClubs')
      .populate('registeredEvents');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.status(200).json({
      message: 'Profile updated successfully',

      user: await profilePayload(user)
    });
  } catch (error) {
    console.error('Update profile error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// CHANGE PASSWORD
// =====================================================
export const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Please provide current and new passwords'
      });
    }

    if (typeof newPassword !== 'string' || !isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENT_TEXT });
    }

    const user = await User.findById(
      req.user.id
    ).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    // Covering "same as the temporary password" as well: that hash is the one
    // still stored until setup completes.
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'Please choose a password different from your current one'
      });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(
      newPassword,
      salt
    );

    // Revokes every previously issued token for this account, which is the
    // point of recording the change time.
    user.passwordChangedAt = secondAlignedTimestamp();
    user.temporaryPasswordExpiresAt = null;

    await user.save();

    audit('password_changed', {
      userId: user._id,
      role: user.role,
      source: 'change_password'
    });

    // The caller's own token is now invalid, so a replacement ships back in
    // the same response or the frontend would bounce the user to /login.
    res.status(200).json({
      message: 'Password changed successfully',
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    console.error('Change password error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// GET ALL USERS
// =====================================================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('joinedClubs')
      .populate('registeredEvents');

    res.status(200).json({
      users
    });
  } catch (error) {
    console.error('Get users error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// COMPLETE MANDATORY PASSWORD SETUP
// =====================================================
// Reached only with the restricted setup token issued by login; the gate lives
// in verifyPasswordSetupToken, which also re-checks that the requirement and
// the temporary password are still outstanding.
export const completePasswordSetup = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }

    if (
      confirmPassword !== undefined &&
      confirmPassword !== null &&
      confirmPassword !== newPassword
    ) {
      return res.status(400).json({
        message: 'New password and confirmation do not match'
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENT_TEXT });
    }

    const user = req.passwordSetupUser;

    // The temporary password must not survive as the permanent one; keeping it
    // would leave a credential an admin knows and never rotated away.
    const reusesTemp = await bcrypt.compare(newPassword, user.password);

    if (reusesTemp) {
      return res.status(400).json({
        message:
          'You cannot reuse your temporary password. Please choose a new one.'
      });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = secondAlignedTimestamp();
    user.isFirstLogin = false;
    user.mustChangePassword = false;
    user.temporaryPasswordExpiresAt = null;

    await user.save();

    audit('password_setup_completed', {
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // From here on the account holds a normal session token; the setup token
    // has no remaining use.
    res.status(200).json({
      message: 'Password set successfully. You can now access your dashboard.',
      token: generateToken(user._id, user.role),
      user: authUserPayload(user)
    });
  } catch (error) {
    console.error('Password setup error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// ADMIN: CREATE ACCOUNT WITH TEMPORARY PASSWORD
// =====================================================
// An admin may open an account at any tier - student, leader or admin. Admin is
// the top role in this system, so every creation is audited rather than gated
// by a higher privilege.
const ADMIN_CREATABLE_ROLES = ['student', 'club_leader', 'admin'];

// Optional profile fields an admin may pre-fill. Privilege-bearing keys (role,
// email and password are handled explicitly; joinedClubs, certificates, tokens)
// are deliberately absent so a crafted body cannot grant anything.
const ADMIN_CREATABLE_PROFILE_FIELDS = [
  'studentId',
  'personalEmail',
  'department',
  'year',
  'semester',
  'course',
  'section',
  'phone',
  'address',
  'gender'
];

const tempPasswordExpiry = () =>
  new Date(Date.now() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000);

// Deliberately a hand-written projection: the created document still holds the
// plaintext in memory and `user.toObject()` would happily serialise anything
// that is not select:false.
const createdAccountPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId,
  department: user.department,
  course: user.course,
  year: user.year,
  section: user.section,
  semester: user.semester,
  phone: user.phone,
  isFirstLogin: user.isFirstLogin,
  mustChangePassword: user.mustChangePassword,
  temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt
});

export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      !name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: 'Please provide a name and email'
      });
    }

    const effectiveRole = role === undefined ? 'student' : role;

    if (!ADMIN_CREATABLE_ROLES.includes(effectiveRole)) {
      return res.status(400).json({
        message: 'Role must be student, club_leader or admin'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);

    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(temporaryPassword, salt),
      role: effectiveRole,
      isFirstLogin: true,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: tempPasswordExpiry()
    };

    for (const field of ADMIN_CREATABLE_PROFILE_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        userData[field] = req.body[field];
      }
    }

    const user = new User(userData);

    await user.save();

    audit('account_created', {
      actorId: req.user.id,
      actorRole: req.user.role,
      userId: user._id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      message:
        `Account created. Share this temporary password with the user - ` +
        `it is shown only once and expires in ${TEMP_PASSWORD_TTL_HOURS} hours.`,
      user: createdAccountPayload(user),
      temporaryPassword,
      temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt
    });
  } catch (error) {
    console.error('Admin create user error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((field) => field.message)
          .join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// ADMIN: REGENERATE TEMPORARY PASSWORD
// =====================================================
// Replaces the stored hash, so the old temporary password stops matching
// immediately, and re-arms the mandatory setup requirement, which also drops
// any live session the account has.
export const regenerateTemporaryPassword = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        message:
          'You cannot reset your own temporary password. Another administrator ' +
          'must do this, or use Account & Settings to change your password.'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(temporaryPassword, salt);
    user.isFirstLogin = true;
    user.mustChangePassword = true;
    user.temporaryPasswordExpiresAt = tempPasswordExpiry();

    await user.save();

    audit('temporary_password_regenerated', {
      actorId: req.user.id,
      actorRole: req.user.role,
      userId: user._id,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      message:
        `New temporary password issued. It replaces the previous one, ends any ` +
        `active session for this account and expires in ` +
        `${TEMP_PASSWORD_TTL_HOURS} hours.`,
      user: createdAccountPayload(user),
      temporaryPassword,
      temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt
    });
  } catch (error) {
    console.error('Regenerate temporary password error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};