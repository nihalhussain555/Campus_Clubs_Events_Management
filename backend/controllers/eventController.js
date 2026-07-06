import Event from '../models/Event.js';
import User from '../models/User.js';
import Club from '../models/Club.js';

// Create Event (Admin only)
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, location, club, capacity } = req.body;

    if (!title || !description || !date || !club) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Verify club exists
    const clubExists = await Club.findById(club);
    if (!clubExists) {
      return res.status(404).json({ message: 'Club not found' });
    }

    const event = new Event({
      title,
      description,
      date,
      location,
      club,
      capacity: capacity || 100
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email');

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('club', 'clubName description')
      .populate('registeredStudents', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Events by Club
export const getEventsByClub = async (req, res) => {
  try {
    const events = await Event.find({ club: req.params.clubId })
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email');

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Event (Admin only)
export const updateEvent = async (req, res) => {
  try {
    const { title, description, date, location, capacity, status } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = date;
    if (location) event.location = location;
    if (capacity) event.capacity = capacity;
    if (status) event.status = status;

    await event.save();

    res.status(200).json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Event (Admin only)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register for Event (Student)
export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already registered
    if (event.registeredStudents.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Check capacity
    if (event.registeredStudents.length >= event.capacity) {
      return res.status(400).json({ message: 'Event is at full capacity' });
    }

    event.registeredStudents.push(req.user.id);
    await event.save();

    const user = await User.findById(req.user.id);
    user.registeredEvents.push(req.params.id);
    await user.save();

    res.status(200).json({ message: 'Registered for event successfully', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unregister from Event (Student)
export const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.registeredStudents = event.registeredStudents.filter(
      student => student.toString() !== req.user.id
    );
    await event.save();

    const user = await User.findById(req.user.id);
    user.registeredEvents = user.registeredEvents.filter(
      eventId => eventId.toString() !== req.params.id
    );
    await user.save();

    res.status(200).json({ message: 'Unregistered from event successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Upcoming Events
export const getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      date: { $gte: now },
      status: 'upcoming'
    })
      .populate('club', 'clubName')
      .populate('registeredStudents', 'name email')
      .sort({ date: 1 });

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
