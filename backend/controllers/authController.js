import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

// =====================================================
// GENERATE JWT
// =====================================================
const generateToken = (id, role) => {
  return jwt.sign(
    {
      id: id.toString(),
      role
    },
    JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );
};

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

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please provide all required fields'
      });
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

      user: {
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
      }
    });
  } catch (error) {
    console.error('Signup error:', error);

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

    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide email and password'
      });
    }

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
      return res.status(401).json({
        message: 'Invalid credentials'
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

    res.status(200).json({
      message: 'Login successful',

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: currentRole,
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
      }
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

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

        joinedClubs: user.joinedClubs || [],
        registeredEvents: user.registeredEvents || [],

        createdAt: user.createdAt
      }
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
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const updates = {
      ...req.body
    };

    // NEVER allow normal profile update to change these
    delete updates.password;
    delete updates.role;
    delete updates.email;

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

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

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

        joinedClubs: user.joinedClubs || [],
        registeredEvents: user.registeredEvents || [],

        createdAt: user.createdAt
      }
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters'
      });
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

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(
      newPassword,
      salt
    );

    await user.save();

    res.status(200).json({
      message: 'Password changed successfully'
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