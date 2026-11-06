import Club from '../models/Club.js';
import User from '../models/User.js';
import Event from '../models/Event.js';

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
      req.user.effectiveRole !== 'admin'
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
      req.user.effectiveRole !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not authorized to delete this club'
      });
    }

    // Deleting the club would leave its events pointing at a missing club, so
    // the events are cleared deliberately rather than orphaned.
    const eventCount = await Event.countDocuments({ club: club._id });

    if (eventCount > 0) {
      return res.status(409).json({
        message:
          `This club still has ${eventCount} event(s). Delete or reassign those events first.`
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
// TRANSFER CLUB LEADERSHIP
// =====================================================
export const transferClubAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    const isCurrentAdmin = club.admin.toString() === req.user.id;
    const isAdmin = req.user.effectiveRole === 'admin';

    if (!isCurrentAdmin && !isAdmin) {
      return res.status(403).json({
        message: 'Not authorized to transfer this club'
      });
    }

    const isMember = club.members.some(
      (member) => member.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        message: 'The new club leader must already be a member'
      });
    }

    club.admin = userId;

    await club.save();

    // Promote the incoming leader, but never demote an existing admin.
    const newLeader = await User.findById(userId);

    if (newLeader && newLeader.role !== 'admin') {
      newLeader.role = 'club_leader';
      await newLeader.save();
    }

    const updatedClub = await Club.findById(club._id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(200).json({
      message: 'Club leadership transferred',
      club: updatedClub
    });
  } catch (error) {
    console.error('Transfer club admin error:', error);

    res.status(500).json({ message: 'Server error', error: error.message });
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

    // Letting the running leader walk away would leave the club with no one who
    // can manage it, so they must hand over the club admin first.
    if (club.admin.toString() === req.user.id) {
      return res.status(400).json({
        message:
          'Club leaders cannot leave their own club. Transfer the club to another member first.'
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