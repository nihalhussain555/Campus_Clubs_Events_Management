import Event from '../models/Event.js';
import Certificate from '../models/Certificate.js';

import {
  issueCertificate
} from './certificateController.js';


// =====================================================
// HELPERS
// =====================================================

const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};


const getCurrentStatus = (event) => {
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

  return 'completed';
};


// =====================================================
// CREATE EVENT
// POST /api/events
// ADMIN
// =====================================================

export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      endDate,
      location,
      category,
      club,
      capacity,
      certificateEnabled
    } = req.body;

    if (!title || !description || !date || !endDate || !club) {
      return res.status(400).json({
        success: false,
        message:
          'Title, description, start date, end date and club are required'
      });
    }

    const startDate = new Date(date);
    const finishDate = new Date(endDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(finishDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start or end date'
      });
    }

    if (finishDate <= startDate) {
      return res.status(400).json({
        success: false,
        message:
          'End date and time must be after start date and time'
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date: startDate,
      endDate: finishDate,
      location: location?.trim() || 'TBD',
      category: category?.trim() || 'General',
      club,
      capacity: Number(capacity) || 100,
      certificateEnabled:
        certificateEnabled !== undefined
          ? Boolean(certificateEnabled)
          : true,
      status: 'upcoming'
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: populatedEvent
    });

  } catch (error) {
    console.error('Create event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};


// =====================================================
// GET ALL EVENTS
// GET /api/events
// =====================================================

export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email')
      .sort({ date: 1 });

    const updatedEvents = events.map((event) => {
      const status = getCurrentStatus(event);

      if (
        event.status !== 'cancelled' &&
        event.status !== status
      ) {
        Event.findByIdAndUpdate(
          event._id,
          { status }
        ).catch(() => {});
      }

      return {
        ...event.toObject(),
        status
      };
    });

    return res.status(200).json({
      success: true,
      count: updatedEvents.length,
      events: updatedEvents
    });

  } catch (error) {
    console.error('Get all events error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};


// =====================================================
// GET EVENT BY ID
// GET /api/events/:id
// =====================================================

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const status = getCurrentStatus(event);

    return res.status(200).json({
      success: true,
      event: {
        ...event.toObject(),
        status
      }
    });

  } catch (error) {
    console.error('Get event by ID error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
};


// =====================================================
// GET EVENTS BY CLUB
// GET /api/events/club/:clubId
// =====================================================

export const getEventsByClub = async (req, res) => {
  try {
    const events = await Event.find({
      club: req.params.clubId
    })
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .sort({ date: 1 });

    const result = events.map((event) => ({
      ...event.toObject(),
      status: getCurrentStatus(event)
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      events: result
    });

  } catch (error) {
    console.error('Get club events error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch club events',
      error: error.message
    });
  }
};


// =====================================================
// GET UPCOMING EVENTS
// GET /api/events/upcoming
// =====================================================

export const getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();

    const events = await Event.find({
      date: { $gt: now },
      status: { $ne: 'cancelled' }
    })
      .populate('club', 'clubName')
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
      error: error.message
    });
  }
};


// =====================================================
// UPDATE EVENT
// PUT /api/events/:id
// ADMIN
// =====================================================

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const {
      title,
      description,
      date,
      endDate,
      location,
      category,
      club,
      capacity,
      status,
      certificateEnabled
    } = req.body;

    const startDate = date
      ? new Date(date)
      : event.date;

    const finishDate = endDate
      ? new Date(endDate)
      : event.endDate;

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(finishDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start or end date'
      });
    }

    if (finishDate <= startDate) {
      return res.status(400).json({
        success: false,
        message:
          'End date and time must be after start date and time'
      });
    }

    event.title = title ?? event.title;
    event.description = description ?? event.description;
    event.date = startDate;
    event.endDate = finishDate;
    event.location = location ?? event.location;
    event.category = category ?? event.category;
    event.club = club ?? event.club;

    if (capacity !== undefined) {
      event.capacity = Number(capacity);
    }

    if (certificateEnabled !== undefined) {
      event.certificateEnabled =
        Boolean(certificateEnabled);
    }

    if (status === 'cancelled') {
      event.status = 'cancelled';
    } else {
      event.status = getCurrentStatus(event);
    }

    await event.save();

    const updatedEvent = await Event.findById(event._id)
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email')
      .populate('participants', 'name email')
      .populate('certificateRecipients', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Update event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
};


// =====================================================
// DELETE EVENT
// DELETE /api/events/:id
// ADMIN
// =====================================================

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Delete certificates associated with this event
    await Certificate.deleteMany({
      event: event._id
    });

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
};


// =====================================================
// REGISTER
// POST /api/events/:id/register
// =====================================================

export const registerForEvent = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const status = getCurrentStatus(event);

    if (status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message:
          'Registration is available only for upcoming events'
      });
    }

    const alreadyRegistered =
      event.registeredStudents.some(
        (id) =>
          id.toString() === userId.toString()
      );

    if (alreadyRegistered) {
      return res.status(409).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    if (
      event.registeredStudents.length >= event.capacity
    ) {
      return res.status(400).json({
        success: false,
        message: 'Event registration is full'
      });
    }

    event.registeredStudents.push(userId);

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      event
    });

  } catch (error) {
    console.error('Register event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};


// =====================================================
// UNREGISTER
// POST /api/events/:id/unregister
// =====================================================

export const unregisterFromEvent = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const status = getCurrentStatus(event);

    if (status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message:
          'You can only unregister before the event starts'
      });
    }

    const isRegistered =
      event.registeredStudents.some(
        (id) =>
          id.toString() === userId.toString()
      );

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this event'
      });
    }

    event.registeredStudents =
      event.registeredStudents.filter(
        (id) =>
          id.toString() !== userId.toString()
      );

    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event'
    });

  } catch (error) {
    console.error('Unregister event error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unregistration failed',
      error: error.message
    });
  }
};


// =====================================================
// ATTEND EVENT
// POST /api/events/:id/attend
// REGISTERED STUDENTS
// =====================================================

export const attendEvent = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const isRegistered =
      event.registeredStudents.some(
        (student) =>
          student.toString() === userId.toString()
      );

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message:
          'You must register for this event before attending'
      });
    }

    const startTime = new Date(event.date);
    const endTime = new Date(event.endDate);
    const now = new Date();

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message:
          'Attendance is available only when the event starts'
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message:
          'Attendance is closed because the event has ended'
      });
    }

    const alreadyAttended =
      event.participants.some(
        (student) =>
          student.toString() === userId.toString()
      );

    if (alreadyAttended) {
      return res.status(409).json({
        success: false,
        message:
          'You have already marked attendance'
      });
    }

    event.participants.push(userId);
    event.status = 'ongoing';

    await event.save();

    // Generate certificate only when enabled
    let certificate = null;

    if (event.certificateEnabled) {
      certificate = await issueCertificate(
        userId,
        event._id
      );
    }

    const updatedEvent =
      await Event.findById(event._id)
        .populate(
          'club',
          'clubName category'
        )
        .populate(
          'registeredStudents',
          'name email'
        )
        .populate(
          'participants',
          'name email'
        )
        .populate(
          'certificateRecipients',
          'name email'
        );

    return res.status(200).json({
      success: true,
      message:
        'Attendance marked successfully',
      event: updatedEvent,
      certificate
    });

  } catch (error) {
    console.error(
      'Attend event error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to mark attendance'
    });
  }
};


// =====================================================
// ADMIN MARK ATTENDANCE
// POST /api/events/:id/attendance
// ADMIN
// =====================================================

export const markAttendance = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const isRegistered =
      event.registeredStudents.some(
        (id) =>
          id.toString() === userId.toString()
      );

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message:
          'Student must be registered for the event'
      });
    }

    const alreadyAttended =
      event.participants.some(
        (id) =>
          id.toString() === userId.toString()
      );

    if (alreadyAttended) {
      return res.status(409).json({
        success: false,
        message:
          'Student has already been marked as attended'
      });
    }

    event.participants.push(userId);

    if (getCurrentStatus(event) !== 'cancelled') {
      event.status = 'ongoing';
    }

    await event.save();

    let certificate = null;

    if (event.certificateEnabled) {
      certificate = await issueCertificate(
        userId,
        event._id
      );
    }

    const updatedEvent =
      await Event.findById(event._id)
        .populate('club', 'clubName')
        .populate(
          'registeredStudents',
          'name email'
        )
        .populate(
          'participants',
          'name email'
        )
        .populate(
          'certificateRecipients',
          'name email'
        );

    return res.status(200).json({
      success: true,
      message:
        'Attendance marked successfully',
      event: updatedEvent,
      certificate
    });

  } catch (error) {
    console.error(
      'Admin mark attendance error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to mark attendance'
    });
  }
};


// =====================================================
// ADMIN REMOVE ATTENDANCE
// DELETE /api/events/:id/attendance
// ADMIN
// =====================================================

export const removeAttendance = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const attended =
      event.participants.some(
        (id) =>
          id.toString() === userId.toString()
      );

    if (!attended) {
      return res.status(400).json({
        success: false,
        message:
          'Student has not been marked as attended'
      });
    }

    event.participants =
      event.participants.filter(
        (id) =>
          id.toString() !== userId.toString()
      );

    await event.save();

    // Remove certificate generated for this attendance
    await Certificate.deleteMany({
      event: event._id,
      user: userId
    });

    const updatedEvent =
      await Event.findById(event._id)
        .populate('club', 'clubName')
        .populate(
          'registeredStudents',
          'name email'
        )
        .populate(
          'participants',
          'name email'
        )
        .populate(
          'certificateRecipients',
          'name email'
        );

    return res.status(200).json({
      success: true,
      message:
        'Attendance removed successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error(
      'Remove attendance error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to remove attendance'
    });
  }
};


// =====================================================
// EVENT HISTORY
// GET /api/events/history/my
// =====================================================

export const getMyEventHistory = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const events = await Event.find({
      $or: [
        {
          registeredStudents: userId
        },
        {
          participants: userId
        }
      ]
    })
      .populate('club', 'clubName')
      .sort({ date: -1 });

    const history = events.map((event) => {
      const attended =
        event.participants.some(
          (id) =>
            id.toString() === userId.toString()
        );

      return {
        ...event.toObject(),
        status: getCurrentStatus(event),
        attended
      };
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      events: history
    });

  } catch (error) {
    console.error(
      'Get event history error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to load event history',
      error: error.message
    });
  }
};
