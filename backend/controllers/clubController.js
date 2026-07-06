import Club from '../models/Club.js';
import User from '../models/User.js';

// Create Club (Admin only)
export const createClub = async (req, res) => {
  try {
    const { clubName, description } = req.body;

    if (!clubName || !description) {
      return res.status(400).json({ message: 'Please provide club name and description' });
    }

    const club = new Club({
      clubName,
      description,
      admin: req.user.id,
      members: [req.user.id]
    });

    await club.save();

    res.status(201).json({
      message: 'Club created successfully',
      club
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Clubs
export const getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find()
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(200).json({ clubs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Club by ID
export const getClubById = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    res.status(200).json({ club });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Club (Admin only)
export const updateClub = async (req, res) => {
  try {
    const { clubName, description } = req.body;

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Check if user is admin of this club
    if (club.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this club' });
    }

    if (clubName) club.clubName = clubName;
    if (description) club.description = description;

    await club.save();

    res.status(200).json({
      message: 'Club updated successfully',
      club
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Club (Admin only)
export const deleteClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Check if user is admin of this club or system admin
    if (club.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this club' });
    }

    await Club.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Club deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join Club (Student)
export const joinClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Check if already member
    if (club.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already a member of this club' });
    }

    club.members.push(req.user.id);
    await club.save();

    const user = await User.findById(req.user.id);
    user.joinedClubs.push(req.params.id);
    await user.save();

    res.status(200).json({ message: 'Joined club successfully', club });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Leave Club (Student)
export const leaveClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Remove user from club members
    club.members = club.members.filter(member => member.toString() !== req.user.id);
    await club.save();

    // Remove club from user's joinedClubs
    const user = await User.findById(req.user.id);
    user.joinedClubs = user.joinedClubs.filter(clubId => clubId.toString() !== req.params.id);
    await user.save();

    res.status(200).json({ message: 'Left club successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
