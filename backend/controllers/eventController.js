import Event from '../models/Event.js';
import User from '../models/User.js';
import Club from '../models/Club.js';

// =====================================================
// CREATE EVENT - ADMIN ONLY
// =====================================================
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      club,
      capacity,
      category
    } = req.body;

    if (!title || !description || !date || !club) {
      return res.status(400).json({
        message: 'Please provide all required fields'
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
      date,
      location,
      club,
      capacity: capacity || 100,
      category: category || clubExists.category || 'General'
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
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
// GET ALL EVENTS
// =====================================================
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('club', 'clubName category')
      .populate('registeredStudents', 'name email');

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
      .populate('registeredStudents', 'name email');

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
      .populate('registeredStudents', 'name email');

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

    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = date;
    if (location) event.location = location;
    if (capacity) event.capacity = capacity;
    if (status) event.status = status;
    if (category) event.category = category;
    if (club) event.club = club;

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

    if (event.registeredStudents.some(
      student => student.toString() === req.user.id.toString()
    )) {
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
// GET MY CERTIFICATES
// =====================================================
// A certificate is available when:
// 1. Student registered for the event
// 2. Event date has passed
// 3. Event is not cancelled
//
// This does NOT verify physical attendance.
// =====================================================
export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const events = await Event.find({
      registeredStudents: userId,
      date: { $lt: now },
      status: { $ne: 'cancelled' }
    })
      .populate('club', 'clubName category')
      .sort({ date: -1 });

    const certificates = events.map((event) => ({
      certificateId: `CERT-${event._id.toString().slice(-8).toUpperCase()}`,
      eventId: event._id,
      eventName: event.title,
      eventDescription: event.description,
      eventDate: event.date,
      location: event.location,
      category: event.category,
      clubName: event.club?.clubName || 'Campus Club'
    }));

    res.status(200).json({
      certificates
    });
  } catch (error) {
    res.status(500).json({
      message: 'Unable to load certificates',
      error: error.message
    });
  }
};
