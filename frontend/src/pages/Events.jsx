import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { eventAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import RegisterEventModal from '../components/RegisterEventModal';
import { Calendar, MapPin, Users, Trash2, Plus } from 'lucide-react';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    club: '',
    capacity: 100
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchEvents();
    fetchClubs();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventAPI.getAllEvents();
      setEvents(response.data.events);

      const userProfile = JSON.parse(localStorage.getItem('user') || '{}');
      if (userProfile.registeredEvents) {
        setRegisteredEventIds(userProfile.registeredEvents.map(event =>
          typeof event === 'string' ? event : event._id
        ));
      }
      setLoading(false);
    } catch (error) {
      setToast({ message: 'Error loading events', type: 'error' });
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await (await import('../services/api')).clubAPI.getAllClubs();
      setClubs(response.data.clubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
    }
  };

  const handleRegisterEventClick = (event) => {
    setSelectedEvent(event);
    setShowRegisterModal(true);
  };

  const handleConfirmRegister = async (modalData) => {
    if (!selectedEvent) return;
    
    setRegisteringEvent(true);
    try {
      await eventAPI.registerForEvent(selectedEvent._id);
      setRegisteredEventIds([...registeredEventIds, selectedEvent._id]);
      setToast({ message: 'Successfully registered for event!', type: 'success' });
      setShowRegisterModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error registering for event', type: 'error' });
    } finally {
      setRegisteringEvent(false);
    }
  };

  const handleUnregisterEvent = async (eventId) => {
    try {
      await eventAPI.unregisterFromEvent(eventId);
      setRegisteredEventIds(registeredEventIds.filter(id => id !== eventId));
      setToast({ message: 'Successfully unregistered from event!', type: 'success' });
      fetchEvents();
    } catch (error) {
      setToast({ message: 'Error unregistering from event', type: 'error' });
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.date || !formData.club) {
      setToast({ message: 'Please fill all required fields', type: 'error' });
      return;
    }

    try {
      await eventAPI.createEvent(formData);
      setToast({ message: 'Event created successfully!', type: 'success' });
      setFormData({ title: '', description: '', date: '', location: '', club: '', capacity: 100 });
      setShowForm(false);
      fetchEvents();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error creating event', type: 'error' });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventAPI.deleteEvent(eventId);
        setToast({ message: 'Event deleted successfully!', type: 'success' });
        fetchEvents();
      } catch (error) {
        setToast({ message: 'Error deleting event', type: 'error' });
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto px-4 py-8 glass">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">📅 All Events</h1>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} /> Create Event
            </button>
          )}
        </div>

        {showForm && user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Tech Workshop"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Club *</label>
                  <select
                    value={formData.club}
                    onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a club</option>
                    {clubs.map(club => (
                      <option key={club._id} value={club._id}>{club.clubName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event description"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Room 101"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event._id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{event.title}</h3>
              
              <p className="text-gray-600 mb-4">{event.description}</p>
              
              <div className="space-y-2 text-gray-700 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  <span>{formatDate(event.date)}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-red-500" />
                    <span>{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-green-500" />
                  <span>{event.registeredStudents?.length || 0} / {event.capacity} registered</span>
                </div>
              </div>

              <div className="mb-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                  event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>

              <div className="flex gap-2">
                {registeredEventIds.includes(event._id) ? (
                  <button
                    onClick={() => handleUnregisterEvent(event._id)}
                    className="flex-1 bg-red-500 bg-opacity-60 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold transition"
                  >
                    Tap to Unregister
                  </button>
                ) : (
                  <button
                    onClick={() => handleRegisterEventClick(event)}
                    disabled={event.registeredStudents?.length >= event.capacity}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {event.registeredStudents?.length >= event.capacity ? 'Full' : 'Register'}
                  </button>
                )}
                
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteEvent(event._id)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No events available yet</p>
          </div>
        )}
      </div>

      <RegisterEventModal
        event={selectedEvent}
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setSelectedEvent(null);
        }}
        onConfirm={handleConfirmRegister}
        loading={registeringEvent}
      />
    </div>
  );
};

export default Events;
