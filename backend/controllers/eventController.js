import Event from '../models/Event.js';
import User from '../models/User.js';
import Club from '../models/Club.js';


export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      endDate,
      location,
      club,
      capacity,
      category
    } = req.body;

    if (!title || !description || !date || !endDate || !club) {
      return res.status(400).json({
        message: 'Please provide all required fields'
      });
    }

    const startDate = new Date(date);
    const finishDate = new Date(endDate);

    if (isNaN(startDate.getTime()) || isNaN(finishDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid event date'
      });
    }

    if (finishDate <= startDate) {
      return res.status(400).json({
        message: 'End date must be after start date'
      });
    }

    const clubExists = await Club.findById(club);

    if (!clubExists) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    const event = new Event({
      title,
      description,
      date: startDate,
      endDate: finishDate,
      location,
      club,
      capacity: capacity || 100,
      category: category || clubExists.category || 'General',
      status: 'upcoming'
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event
    });

  } catch (error) {
    console.error('Create event error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// GET ALL EVENTS
// =====================================================
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .sort({ date: 1 });

    res.status(200).json({
      events
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// GET EVENT BY ID
// =====================================================
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('club', 'clubName description category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email');

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    res.status(200).json({
      event
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// GET EVENTS BY CLUB
// =====================================================
export const getEventsByClub = async (req, res) => {
  try {
    const events = await Event.find({
      club: req.params.clubId
    })
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .sort({ date: 1 });

    res.status(200).json({
      events
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// UPDATE EVENT - ADMIN ONLY
// =====================================================
export const updateEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      endDate,
      location,
      capacity,
      status,
      category,
      club
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = date;
    if (endDate !== undefined) event.endDate = endDate;
    if (location !== undefined) event.location = location;
    if (capacity !== undefined) event.capacity = capacity;
    if (status !== undefined) event.status = status;
    if (category !== undefined) event.category = category;

    if (club !== undefined) {
      const clubExists = await Club.findById(club);

      if (!clubExists) {
        return res.status(404).json({
          message: 'Club not found'
        });
      }

      event.club = club;
    }

    if (event.endDate && new Date(event.endDate) < new Date(event.date)) {
      return res.status(400).json({
        message: 'End date cannot be before start date'
      });
    }

    await event.save();

    res.status(200).json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// DELETE EVENT - ADMIN ONLY
// =====================================================
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    await User.updateMany(
      { registeredEvents: event._id },
      { $pull: { registeredEvents: event._id } }
    );

    res.status(200).json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// REGISTER FOR EVENT
// =====================================================
export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({
        message: 'This event has been cancelled'
      });
    }

    if (event.status === 'completed') {
      return res.status(400).json({
        message: 'This event has already completed'
      });
    }

    const alreadyRegistered = event.registeredStudents.some(
      student => student.toString() === req.user.id.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        message: 'Already registered for this event'
      });
    }

    if (event.registeredStudents.length >= event.capacity) {
      return res.status(400).json({
        message: 'Event is at full capacity'
      });
    }

    event.registeredStudents.push(req.user.id);

    await event.save();

    const user = await User.findById(req.user.id);

    if (user) {
      const alreadyExists = user.registeredEvents.some(
        eventId => eventId.toString() === req.params.id.toString()
      );

      if (!alreadyExists) {
        user.registeredEvents.push(req.params.id);
        await user.save();
      }
    }

    res.status(200).json({
      message: 'Registered for event successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// =====================================================
// ATTEND EVENT
// =====================================================

export const attendEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    const userId = req.user.id;

    // -----------------------------------------
    // Check registration
    // -----------------------------------------

    const isRegistered = event.registeredStudents.some(
      student => student.toString() === userId.toString()
    );

    if (!isRegistered) {
      return res.status(403).json({
        message: 'You must register for this event before attending'
      });
    }

    // -----------------------------------------
    // Check cancellation
    // -----------------------------------------

    if (event.status === 'cancelled') {
      return res.status(400).json({
        message: 'This event has been cancelled'
      });
    }

    // -----------------------------------------
    // Check event timing
    // -----------------------------------------

    const now = new Date();

    if (now < event.date) {
      return res.status(400).json({
        message: 'The event has not started yet'
      });
    }

    if (now > event.endDate) {
      return res.status(400).json({
        message: 'The event has already ended'
      });
    }

    // -----------------------------------------
    // Check already attended
    // -----------------------------------------

    const alreadyAttended = event.participants.some(
      student => student.toString() === userId.toString()
    );

    if (alreadyAttended) {
      return res.status(400).json({
        message: 'You have already attended this event'
      });
    }

    // -----------------------------------------
    // Mark attendance
    // -----------------------------------------

    event.participants.push(userId);

    // -----------------------------------------
    // Generate certificate
    // -----------------------------------------

    if (event.certificateEnabled) {
      const alreadyHasCertificate =
        event.certificateRecipients.some(
          student => student.toString() === userId.toString()
        );

      if (!alreadyHasCertificate) {
        event.certificateRecipients.push(userId);
      }

      if (!event.certificateIssuedAt) {
        event.certificateIssuedAt = new Date();
      }
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully. Certificate generated.',
      attended: true,
      certificateGenerated: event.certificateEnabled,
      certificateId: `CERT-${event._id.toString().slice(-8).toUpperCase()}`,
      event
    });

  } catch (error) {
    console.error('Attend event error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to mark attendance',
      error: error.message
    });
  }
};

// =====================================================
// UNREGISTER FROM EVENT
// =====================================================
export const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    if (event.status === 'completed') {
      return res.status(400).json({
        message: 'Cannot unregister from a completed event'
      });
    }

    event.registeredStudents = event.registeredStudents.filter(
      student => student.toString() !== req.user.id.toString()
    );

    await event.save();

    const user = await User.findById(req.user.id);

    if (user) {
      user.registeredEvents = user.registeredEvents.filter(
        eventId => eventId.toString() !== req.params.id.toString()
      );

      await user.save();
    }

    res.status(200).json({
      message: 'Unregistered from event successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// MARK ATTENDANCE - ADMIN ONLY
// =====================================================
export const markAttendance = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    const registered = event.registeredStudents.some(
      student => student.toString() === userId.toString()
    );

    if (!registered) {
      return res.status(400).json({
        message: 'Student is not registered for this event'
      });
    }

    const alreadyAttended = event.participants.some(
      student => student.toString() === userId.toString()
    );

    if (alreadyAttended) {
      return res.status(400).json({
        message: 'Attendance already marked'
      });
    }

    event.participants.push(userId);

    await event.save();

    res.status(200).json({
      message: 'Attendance marked successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      message: 'Unable to mark attendance',
      error: error.message
    });
  }
};


// =====================================================
// REMOVE ATTENDANCE - ADMIN ONLY
// =====================================================
export const removeAttendance = async (req, res) => {
  try {
    const { userId } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    event.participants = event.participants.filter(
      student => student.toString() !== userId.toString()
    );

    await event.save();

    res.status(200).json({
      message: 'Attendance removed successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      message: 'Unable to remove attendance',
      error: error.message
    });
  }
};


// =====================================================
// GET UPCOMING EVENTS
// =====================================================
export const getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();

    const events = await Event.find({
      date: { $gte: now },
      status: 'upcoming'
    })
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .sort({ date: 1 });

    res.status(200).json({
      events
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =====================================================
// GET MY EVENT HISTORY
// =====================================================
export const getMyEventHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const events = await Event.find({
      registeredStudents: userId,
      $or: [
        { endDate: { $lt: now } },
        {
          endDate: null,
          date: { $lt: now }
        },
        { status: 'completed' }
      ]
    })
      .populate('club', 'clubName category')
      .sort({ date: -1 });

    const history = events.map(event => {
      const attended = event.participants.some(
        participant => participant.toString() === userId.toString()
      );

      const certificate = event.certificateRecipients.some(
        recipient => recipient.toString() === userId.toString()
      );

      return {
        id: event._id,
        eventId: event._id,
        name: event.title,
        description: event.description,
        date: event.date,
        endDate: event.endDate,
        location: event.location,
        category: event.category,
        clubName: event.club?.clubName || 'Campus Club',
        status: attended ? 'Attended' : 'Missed',
        attended,
        certificate
      };
    });

    res.status(200).json({
      history
    });
  } catch (error) {
    res.status(500).json({
      message: 'Unable to load event history',
      error: error.message
    });
  }
};

// =====================================================
// GET MY CERTIFICATES
// Certificate is generated ONLY after attendance
// =====================================================

export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;

    const events = await Event.find({
      certificateRecipients: userId,
      certificateEnabled: true
    })
      .populate('club', 'clubName category')
      .sort({ date: -1 });

    const certificates = events.map((event) => ({
      certificateId: `CERT-${event._id.toString().slice(-8).toUpperCase()}`,

      eventId: event._id,

      eventName: event.title,

      eventDescription: event.description,

      eventDate: event.date,

      endDate: event.endDate,

      location: event.location,

      category: event.category,

      clubName: event.club?.clubName || 'Campus Club',

      issuedAt: event.certificateIssuedAt,

      attended: event.participants.some(
        participant =>
          participant.toString() === userId.toString()
      )
    }));

    res.status(200).json({
      success: true,
      certificates
    });

  } catch (error) {
    console.error('Get certificates error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to load certificates',
      error: error.message
    });
  }
};
// =====================================================
// ATTEND EVENT
// Student must be registered.
// Attendance is allowed only between start and end time.
// =====================================================
export const attendEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    const userId = req.user.id;

    // Must be registered first
    const isRegistered = event.registeredStudents.some(
      student => student.toString() === userId.toString()
    );

    if (!isRegistered) {
      return res.status(400).json({
        message: 'You must register for this event before attending'
      });
    }

    // Start time
    const startTime = new Date(event.date);

    // End time
    // Your frontend sends endDate, so the model must contain it.
    const endTime = new Date(event.endDate);

    const now = new Date();

    // Event is not started yet
    if (now < startTime) {
      return res.status(400).json({
        message: 'Attendance is not available yet'
      });
    }

    // Event has ended
    if (now > endTime) {
      return res.status(400).json({
        message: 'Attendance is closed because the event has ended'
      });
    }

    // Already attended
    const alreadyAttended = event.participants.some(
      student => student.toString() === userId.toString()
    );

    if (alreadyAttended) {
      return res.status(400).json({
        message: 'You have already marked attendance'
      });
    }

    // Add student to participants
    event.participants.push(userId);

    // Certificate recipient
    if (event.certificateEnabled) {
      event.certificateRecipients.push(userId);
    }

    // Event is currently ongoing
    event.status = 'ongoing';

    await event.save();

    res.status(200).json({
      message: 'Attendance marked successfully',
      certificateGenerated: event.certificateEnabled,
      event
    });

  } catch (error) {
    console.error('Attend event error:', error);

    res.status(500).json({
      message: 'Unable to mark attendance',
      error: error.message
    });
  }
};