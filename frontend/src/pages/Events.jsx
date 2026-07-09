import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Plus, Trash2, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import { clubAPI, eventAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import RegisterEventModal from '../components/RegisterEventModal';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState(false);
  const [actionLoadingIds, setActionLoadingIds] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    club: '',
    capacity: 120,
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchEvents = async () => {
    try {
      const response = await eventAPI.getAllEvents();
      const fetchedEvents = response.data.events || [];
      setEvents(fetchedEvents);
      // derive registered event ids from fetched events for the current user
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = currentUser?._id;
      if (userId) {
        const ids = fetchedEvents
          .filter((ev) => (ev.registeredStudents || []).some((s) => (typeof s === 'string' ? s === userId : s._id === userId)))
          .map((ev) => ev._id);
        setRegisteredEventIds(ids);
      } else {
        setRegisteredEventIds([]);
      }
    } catch (error) {
      setToast({ message: 'Error loading events', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs || []);
    } catch (error) {
      setClubs([]);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchClubs();
  }, []);

  const handleConfirmRegister = async () => {
    if (!selectedEvent) return;

    if (registeringEvent || actionLoadingIds.includes(selectedEvent._id)) return;
    setRegisteringEvent(true);
    setActionLoadingIds((ids) => [...ids, selectedEvent._id]);
    try {
      await eventAPI.registerForEvent(selectedEvent._id);
      setToast({ message: 'Successfully registered for event', type: 'success' });
      setShowRegisterModal(false);
      setSelectedEvent(null);
      await fetchEvents();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error registering for event', type: 'error' });
    } finally {
      setRegisteringEvent(false);
      setActionLoadingIds((ids) => ids.filter((id) => id !== selectedEvent._1d && id !== selectedEvent._id));
    }
  };

  const handleUnregisterEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to unregister from this event?')) return;
    if (actionLoadingIds.includes(eventId)) return;
    try {
      setActionLoadingIds((ids) => [...ids, eventId]);
      await eventAPI.unregisterFromEvent(eventId);
      setToast({ message: 'Successfully unregistered from event', type: 'success' });
      await fetchEvents();
    } catch (error) {
      setToast({ message: 'Error unregistering from event', type: 'error' });
    } finally {
      setActionLoadingIds((ids) => ids.filter((id) => id !== eventId));
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
      setToast({ message: 'Event created successfully', type: 'success' });
      setFormData({ title: '', description: '', date: '', location: '', club: '', capacity: 100 });
      setShowForm(false);
      fetchEvents();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error creating event', type: 'error' });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventAPI.deleteEvent(eventId);
      setToast({ message: 'Event deleted successfully', type: 'success' });
      fetchEvents();
    } catch (error) {
      setToast({ message: 'Error deleting event', type: 'error' });
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) return <LoadingSpinner message="Loading events..." />;

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="page-section pt-8">
        <div className="page-container">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Campus calendar</span>
              <h1 className="display-title text-4xl sm:text-5xl">All events</h1>
              <p className="section-copy mt-4">Register for activities and keep track of what is happening next.</p>
            </div>
            {user?.role === 'admin' && (
              <button type="button" onClick={() => setShowForm((open) => !open)} className="btn-primary">
                <Plus size={18} />
                Create event
              </button>
            )}
          </div>

          {showForm && user?.role === 'admin' && (
            <form onSubmit={handleCreateEvent} className="app-card mb-8 space-y-5">
              <h2 className="text-2xl font-black text-black">Create new event</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="field-label">Event title *</label>
                  <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="field" placeholder="Tech Workshop" />
                </div>
                <div>
                  <label className="field-label">Club *</label>
                  <select value={formData.club} onChange={(e) => setFormData({ ...formData, club: e.target.value })} className="field">
                    <option value="">Select a club</option>
                    {clubs.map((club) => (
                      <option key={club._id} value={club._id}>{club.clubName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Description *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="field min-h-28" placeholder="Describe the event" />
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="field-label">Date and time *</label>
                  <input type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="field" />
                </div>
                <div>
                  <label className="field-label">Location</label>
                  <input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="field" placeholder="Room 101" />
                </div>
                <div>
                  <label className="field-label">Capacity</label>
                  <input type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="field" />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className="btn-primary">Create event</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          )}

          {events.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {events.map((event) => {
                const isRegistered = registeredEventIds.includes(event._id);
                const isFull = (event.registeredStudents?.length || 0) >= event.capacity;
                return (
                  <article key={event._id} className="app-card app-card-hover">
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-black">{event.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
                      </div>
                      <span className="chip capitalize">{event.status || 'upcoming'}</span>
                    </div>

                    <div className="mb-5 grid gap-3 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={17} className="text-[#145f82]" />
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={17} className="text-[#145f82]" />
                        {event.location || 'To be announced'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={17} className="text-[#145f82]" />
                        {event.registeredStudents?.length || 0} / {event.capacity} registered
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isRegistered ? (
                        <button type="button" onClick={() => handleUnregisterEvent(event._id)} className="btn-danger flex-1">
                          Unregister
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowRegisterModal(true);
                          }}
                          disabled={isFull}
                          className="btn-primary flex-1"
                        >
                          {isFull ? 'Full' : 'Register'}
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button type="button" onClick={() => handleDeleteEvent(event._id)} className="btn-secondary px-3" aria-label={`Delete ${event.title}`}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="app-card text-center">
              <p className="text-lg font-bold text-slate-500">No events available yet.</p>
            </div>
          )}
        </div>
      </main>

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
