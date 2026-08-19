import Event from '../models/Event.js';
import User from '../models/User.js';
import Club from '../models/Club.js';

import Certificate from '../models/Certificate.js';
import { createCertificate } from './certificateController.js';
// =====================================================
// HELPER - CALCULATE EVENT STATUS FROM START + END TIME
// =====================================================

const getCalculatedStatus = (event) => {
  if (event.status === 'cancelled') {
    return 'cancelled';
  }

  const now = new Date();
  const start = new Date(event.date);
  const end = new Date(event.endDate);

  if (now < start) {
    return 'upcoming';
  }

  if (now >= start && now <= end) {
    return 'ongoing';
  }

  if (now > end) {
    return 'completed';
  }

  return event.status || 'upcoming';
};


// =====================================================
// UPDATE EVENT STATUS
// =====================================================

const updateCalculatedStatus = async (event) => {
  const calculatedStatus = getCalculatedStatus(event);

  if (
    event.status !== 'cancelled' &&
    event.status !== calculatedStatus
  ) {
    event.status = calculatedStatus;
    await event.save();
  }

  return calculatedStatus;
};


// =====================================================
// CREATE EVENT - ADMIN ONLY
// =====================================================

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
        message:
          'Please provide title, description, start date, end date and club'
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
      title: title.trim(),
      description: description.trim(),
      date: startDate,
      endDate: finishDate,
      location: location || 'TBD',
      club,
      capacity: Number(capacity) || 100,
      category: category || clubExists.category || 'General'
    });

    event.status = getCalculatedStatus(event);

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('club', 'clubName category');

    res.status(201).json({
      message: 'Event created successfully',
      event: populatedEvent
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
      .populate('certificateRecipients', 'name email')
      .sort({ date: 1 });

    // Update status based on current time
    for (const event of events) {
      await updateCalculatedStatus(event);
    }

    // Re-fetch after status updates
    const updatedEvents = await Event.find()
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email')
      .sort({ date: 1 });

    res.status(200).json({
      events: updatedEvents
    });

  } catch (error) {
    console.error('Get all events error:', error);

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
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email');

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    await updateCalculatedStatus(event);

    const updatedEvent = await Event.findById(event._id)
      .populate('club', 'clubName description category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email');

    res.status(200).json({
      event: updatedEvent
    });

  } catch (error) {
    console.error('Get event error:', error);

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

    for (const event of events) {
      await updateCalculatedStatus(event);
    }

    const updatedEvents = await Event.find({
      club: req.params.clubId
    })
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .sort({ date: 1 });

    res.status(200).json({
      events: updatedEvents
    });

  } catch (error) {
    console.error('Get club events error:', error);

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
      club,
      certificateEnabled
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    if (title !== undefined) {
      event.title = title;
    }

    if (description !== undefined) {
      event.description = description;
    }

    if (date !== undefined) {
      event.date = new Date(date);
    }

    if (endDate !== undefined) {
      event.endDate = new Date(endDate);
    }

    if (event.endDate <= event.date) {
      return res.status(400).json({
        message: 'End date must be after start date'
      });
    }

    if (location !== undefined) {
      event.location = location;
    }

    if (capacity !== undefined) {
      if (Number(capacity) < 1) {
        return res.status(400).json({
          message: 'Capacity must be at least 1'
        });
      }

      event.capacity = Number(capacity);
    }

    if (category !== undefined) {
      event.category = category;
    }

    if (club !== undefined) {
      const clubExists = await Club.findById(club);

      if (!clubExists) {
        return res.status(404).json({
          message: 'Club not found'
        });
      }

      event.club = club;
    }

    if (certificateEnabled !== undefined) {
      event.certificateEnabled = certificateEnabled;
    }

    // Admin can explicitly cancel
    if (status === 'cancelled') {
      event.status = 'cancelled';
    } else {
      event.status = getCalculatedStatus(event);
    }

    await event.save();

    const updatedEvent = await Event.findById(event._id)
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email');

    res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Update event error:', error);

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

    // Remove event from users' registeredEvents
    await User.updateMany(
      {
        registeredEvents: req.params.id
      },
      {
        $pull: {
          registeredEvents: req.params.id
        }
      }
    );

    res.status(200).json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);

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

    const currentStatus = getCalculatedStatus(event);

    if (event.status === 'cancelled' || currentStatus === 'cancelled') {
      return res.status(400).json({
        message: 'This event has been cancelled'
      });
    }

    if (currentStatus === 'completed') {
      return res.status(400).json({
        message: 'This event has already ended'
      });
    }

    const userId = req.user.id;

    const alreadyRegistered = event.registeredStudents.some(
      student => student.toString() === userId.toString()
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

    event.registeredStudents.push(userId);

    event.status = currentStatus;

    await event.save();

    const user = await User.findById(userId);

    if (user) {
      const alreadyExists = user.registeredEvents?.some(
        eventId => eventId.toString() === req.params.id.toString()
      );

      if (!alreadyExists) {
        if (!user.registeredEvents) {
          user.registeredEvents = [];
        }

        user.registeredEvents.push(req.params.id);
        await user.save();
      }
    }

    const updatedEvent = await Event.findById(event._id)
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email');

    res.status(200).json({
      message: 'Registered for event successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Register event error:', error);

    res.status(500).json({
      message: 'Server error',
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

    const currentStatus = getCalculatedStatus(event);

    if (currentStatus === 'ongoing') {
      return res.status(400).json({
        message: 'You cannot unregister while the event is ongoing'
      });
    }

    if (currentStatus === 'completed') {
      return res.status(400).json({
        message: 'You cannot unregister after the event has ended'
      });
    }

    const userId = req.user.id;

    event.registeredStudents = event.registeredStudents.filter(
      student => student.toString() !== userId.toString()
    );

    await event.save();

    const user = await User.findById(userId);

    if (user && user.registeredEvents) {
      user.registeredEvents = user.registeredEvents.filter(
        eventId => eventId.toString() !== req.params.id.toString()
      );

      await user.save();
    }

    res.status(200).json({
      message: 'Unregistered from event successfully'
    });

  } catch (error) {
    console.error('Unregister event error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


export const attendEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const now = new Date();

    const startTime = new Date(event.date);
    const endTime = new Date(event.endDate);

    // =================================================
    // EVENT TIME VALIDATION
    // =================================================

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message: 'Attendance is not available yet. The event has not started.'
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message: 'Attendance is closed. The event has already ended.'
      });
    }

    // =================================================
    // REGISTRATION CHECK
    // =================================================

    const isRegistered = event.registeredStudents.some(
      studentId =>
        studentId.toString() === userId.toString()
    );

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You must register for this event before attending.'
      });
    }

    // =================================================
    // CHECK EXISTING ATTENDANCE
    // =================================================

    const alreadyAttended = event.participants.some(
      studentId =>
        studentId.toString() === userId.toString()
    );

    if (alreadyAttended) {
      const existingCertificate = await Certificate.findOne({
        student: userId,
        event: eventId
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance already recorded.',
        alreadyAttended: true,
        certificate: existingCertificate
      });
    }

    // =================================================
    // RECORD ATTENDANCE
    // =================================================

    event.participants.push(userId);

    // Event is ongoing
    event.status = 'ongoing';

    await event.save();

    // =================================================
    // GENERATE CERTIFICATE
    // =================================================

    let certificate = null;

    if (event.certificateEnabled !== false) {
      certificate = await createCertificate({
        studentId: userId,
        eventId: eventId
      });

      // Add student to certificate recipients
      const alreadyRecipient =
        event.certificateRecipients.some(
          studentId =>
            studentId.toString() === userId.toString()
        );

      if (!alreadyRecipient) {
        event.certificateRecipients.push(userId);
        await event.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully.',
      attended: true,
      certificate
    });

  } catch (error) {
    console.error('Attend event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      error: error.message
    });
  }
};

// =====================================================
// ADMIN - MARK ATTENDANCE
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

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const isRegistered = event.registeredStudents.some(
      student => student.toString() === userId.toString()
    );

    if (!isRegistered) {
      return res.status(400).json({
        message: 'Student is not registered for this event'
      });
    }

    const alreadyAttended = event.participants.some(
      participant => participant.toString() === userId.toString()
    );

    if (!alreadyAttended) {
      event.participants.push(userId);
    }

    const alreadyCertificateRecipient =
      event.certificateRecipients.some(
        recipient => recipient.toString() === userId.toString()
      );

    if (
      event.certificateEnabled &&
      !alreadyCertificateRecipient
    ) {
      event.certificateRecipients.push(userId);

      if (!event.certificateIssuedAt) {
        event.certificateIssuedAt = new Date();
      }
    }

    await event.save();

    res.status(200).json({
      message: 'Attendance marked successfully',
      event
    });

  } catch (error) {
    console.error('Admin mark attendance error:', error);

    res.status(500).json({
      message: 'Unable to mark attendance',
      error: error.message
    });
  }
};


// =====================================================
// ADMIN - REMOVE ATTENDANCE
// =====================================================

export const removeAttendance = async (req, res) => {
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

    event.participants = event.participants.filter(
      participant => participant.toString() !== userId.toString()
    );

    event.certificateRecipients =
      event.certificateRecipients.filter(
        recipient => recipient.toString() !== userId.toString()
      );

    await event.save();

    res.status(200).json({
      message: 'Attendance removed successfully',
      event
    });

  } catch (error) {
    console.error('Remove attendance error:', error);

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
      status: { $ne: 'cancelled' }
    })
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .sort({ date: 1 });

    for (const event of events) {
      await updateCalculatedStatus(event);
    }

    const updatedEvents = await Event.find({
      date: { $gte: now },
      status: { $ne: 'cancelled' }
    })
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email')
      .sort({ date: 1 });

    res.status(200).json({
      events: updatedEvents
    });

  } catch (error) {
    console.error('Upcoming events error:', error);

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

    const events = await Event.find({
      $or: [
        { registeredStudents: userId },
        { participants: userId }
      ]
    })
      .populate('club', 'clubName category')
      .sort({ date: -1 });

    const history = events.map(event => ({
      eventId: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      location: event.location,
      category: event.category,
      clubName: event.club?.clubName || 'Campus Club',

      registered: event.registeredStudents.some(
        student => student.toString() === userId.toString()
      ),

      attended: event.participants.some(
        participant => participant.toString() === userId.toString()
      ),

      certificateAvailable:
        event.certificateRecipients.some(
          recipient => recipient.toString() === userId.toString()
        )
    }));

    res.status(200).json({
      history
    });

  } catch (error) {
    console.error('Event history error:', error);

    res.status(500).json({
      message: 'Unable to load event history',
      error: error.message
    });
  }
};


// =====================================================
// GET MY CERTIFICATES
// =====================================================
// Certificate ONLY if:
// 1. Student registered
// 2. Student attended
// 3. Student exists in certificateRecipients
// =====================================================

export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;

    const events = await Event.find({
      registeredStudents: userId,
      participants: userId,
      certificateRecipients: userId,
      status: { $ne: 'cancelled' },
      certificateEnabled: true
    })
      .populate('club', 'clubName category')
      .sort({ date: -1 });

    const certificates = events.map(event => ({
      certificateId:
        `CERT-${event._id.toString().slice(-8).toUpperCase()}`,

      eventId: event._id,

      eventName: event.title,

      eventDescription: event.description,

      eventDate: event.date,

      endDate: event.endDate,

      location: event.location,

      category: event.category,

      clubName:
        event.club?.clubName || 'Campus Club',

      issuedAt:
        event.certificateIssuedAt || event.endDate,

      attended: true
    }));

    res.status(200).json({
      certificates
    });

  } catch (error) {
    console.error('Get certificates error:', error);

    res.status(500).json({
      message: 'Unable to load certificates',
      error: error.message
    });
  }
};