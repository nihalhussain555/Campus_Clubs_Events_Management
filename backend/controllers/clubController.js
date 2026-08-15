import Club from '../models/Club.js';
import User from '../models/User.js';

// =====================================================
// CREATE CLUB - ADMIN ONLY
// =====================================================
export const createClub = async (req, res) => {
  try {
    const { clubName, description, category } = req.body;

    if (!clubName?.trim() || !description?.trim()) {
      return res.status(400).json({
        message: 'Please provide club name and description'
      });
    }

    const club = new Club({
      clubName: clubName.trim(),
      description: description.trim(),
      category: category?.trim() || 'General',
      admin: req.user.id,
      members: [req.user.id]
    });

    await club.save();

    const populatedClub = await Club.findById(club._id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(201).json({
      message: 'Club created successfully',
      club: populatedClub
    });
  } catch (error) {
    console.error('Create club error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// GET ALL CLUBS
// =====================================================
export const getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find()
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(200).json({
      clubs
    });
  } catch (error) {
    console.error('Get clubs error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// GET CLUB BY ID
// =====================================================
export const getClubById = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    res.status(200).json({
      club
    });
  } catch (error) {
    console.error('Get club error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// UPDATE CLUB - ADMIN ONLY
// =====================================================
export const updateClub = async (req, res) => {
  try {
    const { clubName, description, category } = req.body;

    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    if (
      club.admin.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this club'
      });
    }

    if (clubName?.trim()) {
      club.clubName = clubName.trim();
    }

    if (description?.trim()) {
      club.description = description.trim();
    }

    if (category?.trim()) {
      club.category = category.trim();
    }

    await club.save();

    const updatedClub = await Club.findById(club._id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(200).json({
      message: 'Club updated successfully',
      club: updatedClub
    });
  } catch (error) {
    console.error('Update club error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// DELETE CLUB - ADMIN ONLY
// =====================================================
export const deleteClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    if (
      club.admin.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not authorized to delete this club'
      });
    }

    // Remove club reference from all users
    await User.updateMany(
      {
        joinedClubs: club._id
      },
      {
        $pull: {
          joinedClubs: club._id
        }
      }
    );

    // Delete club
    await Club.findByIdAndDelete(club._id);

    res.status(200).json({
      message: 'Club deleted successfully'
    });
  } catch (error) {
    console.error('Delete club error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// JOIN CLUB
// =====================================================
export const joinClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    const alreadyMember = club.members.some(
      (member) =>
        member.toString() === req.user.id
    );

    if (alreadyMember) {
      return res.status(409).json({
        message: 'Already a member of this club'
      });
    }

    club.members.push(req.user.id);

    await club.save();

    await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: {
          joinedClubs: club._id
        }
      }
    );

    const updatedClub = await Club.findById(club._id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(200).json({
      message: 'Joined club successfully',
      club: updatedClub
    });
  } catch (error) {
    console.error('Join club error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// LEAVE CLUB
// =====================================================
export const leaveClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    club.members = club.members.filter(
      (member) =>
        member.toString() !== req.user.id
    );

    await club.save();

    await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: {
          joinedClubs: club._id
        }
      }
    );

    res.status(200).json({
      message: 'Left club successfully'
    });
  } catch (error) {
    console.error('Leave club error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};