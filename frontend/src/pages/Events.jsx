import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Users,
  Search,
  Filter,
  CheckCircle,
  Award,
  Clock,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { clubAPI, eventAPI } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';
import RegisterEventModal from '../components/RegisterEventModal';

const Events = () => {
  // =====================================================
  // STATE
  // =====================================================

  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [attendedEventIds, setAttendedEventIds] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [registeringEvent, setRegisteringEvent] = useState(false);

  const [actionLoadingIds, setActionLoadingIds] = useState([]);

  // Search + Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Event Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    club: '',
    capacity: 120,
    category: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // =====================================================
  // FETCH EVENTS
  // =====================================================

  const fetchEvents = async () => {
    try {
      const response = await eventAPI.getAllEvents();

      const fetchedEvents = response.data?.events || [];

      setEvents(fetchedEvents);

      const currentUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      const userId = currentUser?.id || currentUser?._id;

      if (!userId) {
        setRegisteredEventIds([]);
        setAttendedEventIds([]);
        return;
      }

      // Registered events
      const registeredIds = fetchedEvents
        .filter((event) =>
          (event.registeredStudents || []).some((student) => {
            const studentId =
              typeof student === 'string'
                ? student
                : student?._id || student?.id;

            return studentId?.toString() === userId.toString();
          })
        )
        .map((event) => event._id);

      setRegisteredEventIds(registeredIds);

      // Attended events
      const attendedIds = fetchedEvents
        .filter((event) =>
          (event.participants || []).some((student) => {
            const studentId =
              typeof student === 'string'
                ? student
                : student?._id || student?.id;

            return studentId?.toString() === userId.toString();
          })
        )
        .map((event) => event._id);

      setAttendedEventIds(attendedIds);
    } catch (error) {
      console.error('Error loading events:', error);

      setToast({
        message:
          error.response?.data?.message ||
          'Error loading events',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH CLUBS
  // =====================================================

  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();

      setClubs(response.data?.clubs || []);
    } catch (error) {
      console.error('Error loading clubs:', error);
      setClubs([]);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchEvents();
    fetchClubs();
  }, []);

  // =====================================================
  // EVENT STATUS
  // =====================================================
  //
  // IMPORTANT:
  //
  // start time = event.date
  // end time   = event.endDate
  //
  // Before start:
  // Upcoming
  //
  // Between start and end:
  // Ongoing
  //
  // After end:
  // Completed
  //
  // Cancelled always:
  // Cancelled
  //
  // =====================================================

  const getEventStatus = (event) => {
    if (
      event.status?.toLowerCase() === 'cancelled'
    ) {
      return 'Cancelled';
    }

    const now = new Date();

    const startDate = new Date(event.date);

    const endDate = event.endDate
      ? new Date(event.endDate)
      : startDate;

    if (Number.isNaN(startDate.getTime())) {
      return 'Upcoming';
    }

    if (now < startDate) {
      return 'Upcoming';
    }

    if (now >= startDate && now <= endDate) {
      return 'Ongoing';
    }

    return 'Completed';
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleConfirmRegister = async () => {
    if (!selectedEvent) return;

    const eventId = selectedEvent._id;

    if (
      registeringEvent ||
      actionLoadingIds.includes(eventId)
    ) {
      return;
    }

    setRegisteringEvent(true);

    setActionLoadingIds((ids) => [
      ...ids,
      eventId
    ]);

    try {
      await eventAPI.registerForEvent(eventId);

      setToast({
        message: 'Successfully registered for event',
        type: 'success'
      });

      setShowRegisterModal(false);
      setSelectedEvent(null);

      await fetchEvents();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error registering for event',
        type: 'error'
      });
    } finally {
      setRegisteringEvent(false);

      setActionLoadingIds((ids) =>
        ids.filter((id) => id !== eventId)
      );
    }
  };

  // =====================================================
  // UNREGISTER
  // =====================================================

  const handleUnregisterEvent = async (eventId) => {
    if (
      !window.confirm(
        'Are you sure you want to unregister from this event?'
      )
    ) {
      return;
    }

    if (actionLoadingIds.includes(eventId)) {
      return;
    }

    try {
      setActionLoadingIds((ids) => [
        ...ids,
        eventId
      ]);

      await eventAPI.unregisterFromEvent(eventId);

      setToast({
        message: 'Successfully unregistered from event',
        type: 'success'
      });

      await fetchEvents();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error unregistering from event',
        type: 'error'
      });
    } finally {
      setActionLoadingIds((ids) =>
        ids.filter((id) => id !== eventId)
      );
    }
  };

  // =====================================================
  // ATTEND EVENT
  // =====================================================

  const handleAttendEvent = async (event) => {
    const eventId = event._id;

    if (actionLoadingIds.includes(eventId)) {
      return;
    }

    const status = getEventStatus(event);

    // Attendance is ONLY allowed while ongoing
    if (status !== 'Ongoing') {
      setToast({
        message:
          status === 'Upcoming'
            ? 'Attendance will be available when the event starts.'
            : status === 'Completed'
            ? 'This event has already ended.'
            : 'Attendance is not available for this event.',
        type: 'error'
      });

      return;
    }

    // Student must be registered
    if (!registeredEventIds.includes(eventId)) {
      setToast({
        message:
          'You must register for this event before attending.',
        type: 'error'
      });

      return;
    }

    try {
      setActionLoadingIds((ids) => [
        ...ids,
        eventId
      ]);

      await eventAPI.attendEvent(eventId);

      setToast({
        message:
          'Attendance marked successfully! Your certificate is now available.',
        type: 'success'
      });

      setAttendedEventIds((ids) => [
        ...new Set([...ids, eventId])
      ]);

      await fetchEvents();
    } catch (error) {
      console.error('Attendance error:', error);

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to mark attendance',
        type: 'error'
      });
    } finally {
      setActionLoadingIds((ids) =>
        ids.filter((id) => id !== eventId)
      );
    }
  };

  // =====================================================
  // CREATE EVENT
  // =====================================================

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.description ||
      !formData.date ||
      !formData.endDate ||
      !formData.club
    ) {
      setToast({
        message: 'Please fill all required fields',
        type: 'error'
      });

      return;
    }

    const start = new Date(formData.date);
    const end = new Date(formData.endDate);

    if (end <= start) {
      setToast({
        message:
          'End date and time must be after the start date and time.',
        type: 'error'
      });

      return;
    }

    try {
      await eventAPI.createEvent(formData);

      setToast({
        message: 'Event created successfully',
        type: 'success'
      });

      setFormData({
        title: '',
        description: '',
        date: '',
        endDate: '',
        location: '',
        club: '',
        capacity: 120,
        category: ''
      });

      setShowForm(false);

      await fetchEvents();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating event',
        type: 'error'
      });
    }
  };

  // =====================================================
  // DELETE EVENT
  // =====================================================

  const handleDeleteEvent = async (eventId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this event?'
      )
    ) {
      return;
    }

    try {
      await eventAPI.deleteEvent(eventId);

      setToast({
        message: 'Event deleted successfully',
        type: 'success'
      });

      await fetchEvents();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error deleting event',
        type: 'error'
      });
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'TBD';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'TBD';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // =====================================================
  // GET CATEGORIES
  // =====================================================

  const categories = useMemo(() => {
    const values = events
      .map((event) => event.category)
      .filter(Boolean);

    return [...new Set(values)];
  }, [events]);

  // =====================================================
  // FILTER EVENTS
  // =====================================================

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const search = searchTerm
        .trim()
        .toLowerCase();

      const matchesSearch =
        !search ||
        event.title
          ?.toLowerCase()
          .includes(search) ||
        event.description
          ?.toLowerCase()
          .includes(search) ||
        event.location
          ?.toLowerCase()
          .includes(search) ||
        event.category
          ?.toLowerCase()
          .includes(search) ||
        event.club?.clubName
          ?.toLowerCase()
          .includes(search);

      const matchesCategory =
        categoryFilter === 'all' ||
        event.category === categoryFilter;

      const eventClubId =
        typeof event.club === 'string'
          ? event.club
          : event.club?._id;

      const matchesClub =
        clubFilter === 'all' ||
        eventClubId === clubFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        getEventStatus(event).toLowerCase() ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesCategory &&
        matchesClub &&
        matchesStatus
      );
    });
  }, [
    events,
    searchTerm,
    categoryFilter,
    clubFilter,
    statusFilter
  ]);

  // =====================================================
  // RESET FILTERS
  // =====================================================

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setClubFilter('all');
    setStatusFilter('all');
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <LoadingScreen message="Loading events..." />
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app-page">
      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="page-section pt-8">
        <div className="page-container">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <span className="eyebrow">
                Campus calendar
              </span>

              <h1 className="display-title text-4xl sm:text-5xl">
                All events
              </h1>

              <p className="section-copy mt-4">
                Discover events, register, attend ongoing
                events, and earn certificates.
              </p>
            </div>

            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() =>
                  setShowForm((open) => !open)
                }
                className="btn-primary"
              >
                <Plus size={18} />
                Create event
              </button>
            )}
          </div>

          {/* =================================================
              SEARCH + FILTER
          ================================================= */}

          <div className="app-card mb-8">

            <div className="flex items-center gap-2 mb-5">
              <Filter
                size={20}
                className="text-[#145f82]"
              />

              <h2 className="text-xl font-black text-black">
                Find events
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              {/* Search */}

              <div className="lg:col-span-2 relative">
                <label className="field-label">
                  Search events
                </label>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(e.target.value)
                    }
                    className="field pl-10"
                    placeholder="Search by title, location, club..."
                  />
                </div>
              </div>

              {/* Category */}

              <div>
                <label className="field-label">
                  Category
                </label>

                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value)
                  }
                  className="field"
                >
                  <option value="all">
                    All categories
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}

              <div>
                <label className="field-label">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  className="field"
                >
                  <option value="all">
                    All status
                  </option>

                  <option value="upcoming">
                    Upcoming
                  </option>

                  <option value="ongoing">
                    Ongoing
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>
            </div>

            {/* Club filter + clear */}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">

              <div className="flex-1">
                <label className="field-label">
                  Club
                </label>

                <select
                  value={clubFilter}
                  onChange={(e) =>
                    setClubFilter(e.target.value)
                  }
                  className="field"
                >
                  <option value="all">
                    All clubs
                  </option>

                  {clubs.map((club) => (
                    <option
                      key={club._id}
                      value={club._id}
                    >
                      {club.clubName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <X size={16} />
                Clear filters
              </button>
            </div>

            <div className="mt-4 text-sm font-semibold text-slate-500">
              Showing {filteredEvents.length} of{' '}
              {events.length} events
            </div>
          </div>

          {/* =================================================
              CREATE EVENT
          ================================================= */}

          {showForm && user?.role === 'admin' && (
            <form
              onSubmit={handleCreateEvent}
              className="app-card mb-8 space-y-5"
            >

              <h2 className="text-2xl font-black text-black">
                Create new event
              </h2>

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="field-label">
                    Event title *
                  </label>

                  <input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value
                      })
                    }
                    className="field"
                    placeholder="Tech Workshop"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">
                    Club *
                  </label>

                  <select
                    value={formData.club}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        club: e.target.value
                      })
                    }
                    className="field"
                    required
                  >
                    <option value="">
                      Select a club
                    </option>

                    {clubs.map((club) => (
                      <option
                        key={club._id}
                        value={club._id}
                      >
                        {club.clubName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">
                  Description *
                </label>

                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value
                    })
                  }
                  className="field min-h-28"
                  placeholder="Describe the event"
                  required
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="field-label">
                    Start date & time *
                  </label>

                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date: e.target.value
                      })
                    }
                    className="field"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">
                    End date & time *
                  </label>

                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    min={formData.date || undefined}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endDate: e.target.value
                      })
                    }
                    className="field"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">

                <div>
                  <label className="field-label">
                    Location
                  </label>

                  <input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: e.target.value
                      })
                    }
                    className="field"
                    placeholder="Room 101"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Capacity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity:
                          Number(e.target.value)
                      })
                    }
                    className="field"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Category
                  </label>

                  <input
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value
                      })
                    }
                    className="field"
                    placeholder="Technical"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create event
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

              </div>
            </form>
          )}

          {/* =================================================
              EVENTS
          ================================================= */}

          {filteredEvents.length > 0 ? (

            <div className="grid gap-5 lg:grid-cols-2">

              {filteredEvents.map((event) => {

                const isRegistered =
                  registeredEventIds.includes(
                    event._id
                  );

                const isAttended =
                  attendedEventIds.includes(
                    event._id
                  );

                const isFull =
                  (event.registeredStudents?.length ||
                    0) >= event.capacity;

                const eventStatus =
                  getEventStatus(event);

                const isLoading =
                  actionLoadingIds.includes(
                    event._id
                  );

                return (
                  <article
                    key={event._id}
                    className="app-card app-card-hover"
                  >

                    {/* HEADER */}

                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>
                        <h3 className="text-2xl font-black text-black">
                          {event.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {event.description}
                        </p>

                        {event.category && (
                          <span className="inline-block mt-3 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                            {event.category}
                          </span>
                        )}
                      </div>

                      <span
                        className={`chip ${
                          eventStatus ===
                          'Completed'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : eventStatus ===
                              'Ongoing'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : eventStatus ===
                              'Cancelled'
                            ? 'bg-gray-100 text-gray-700 border border-gray-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}
                      >
                        {eventStatus}
                      </span>

                    </div>

                    {/* EVENT INFORMATION */}

                    <div className="mb-5 grid gap-3 text-sm font-bold text-slate-600">

                      <div className="flex items-center gap-2">
                        <Calendar
                          size={17}
                          className="text-[#145f82]"
                        />

                        <span>
                          {formatDate(event.date)}
                        </span>
                      </div>

                      {event.endDate && (
                        <div className="flex items-center gap-2">
                          <Clock
                            size={17}
                            className="text-[#145f82]"
                          />

                          <span>
                            Ends:{' '}
                            {formatDate(
                              event.endDate
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <MapPin
                          size={17}
                          className="text-[#145f82]"
                        />

                        {event.location ||
                          'To be announced'}
                      </div>

                      <div className="flex items-center gap-2">
                        <Users
                          size={17}
                          className="text-[#145f82]"
                        />

                        {event.registeredStudents
                          ?.length || 0}{' '}
                        / {event.capacity}{' '}
                        registered
                      </div>

                      {event.club?.clubName && (
                        <div className="text-sm text-slate-500">
                          Club:{' '}
                          <span className="font-bold text-slate-700">
                            {event.club.clubName}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <div className="flex flex-wrap gap-2 mt-auto">

                      {/* ---------------------------------------------
                          UPCOMING
                      --------------------------------------------- */}

                      {eventStatus ===
                        'Upcoming' && (
                        <>
                          {isRegistered ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUnregisterEvent(
                                  event._id
                                )
                              }
                              disabled={isLoading}
                              className="btn-danger flex-1 whitespace-nowrap text-xs sm:text-sm px-2"
                            >
                              {isLoading
                                ? 'Processing...'
                                : 'Tap to unregister'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEvent(
                                  event
                                );
                                setShowRegisterModal(
                                  true
                                );
                              }}
                              disabled={
                                isFull ||
                                isLoading
                              }
                              className="btn-primary flex-1"
                            >
                              {isFull
                                ? 'Full'
                                : 'Register'}
                            </button>
                          )}
                        </>
                      )}

                      {/* ---------------------------------------------
                          ONGOING
                      --------------------------------------------- */}

                      {eventStatus ===
                        'Ongoing' && (
                        <>
                          {!isRegistered ? (
                            <button
                              type="button"
                              disabled
                              className="btn-secondary flex-1"
                            >
                              Register first
                            </button>
                          ) : isAttended ? (
                            <button
                              type="button"
                              disabled
                              className="flex-1 px-4 py-2 rounded-lg bg-green-100 text-green-700 font-bold flex items-center justify-center gap-2"
                            >
                              <CheckCircle
                                size={18}
                              />
                              Attended
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleAttendEvent(
                                  event
                                )
                              }
                              disabled={isLoading}
                              className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                              <CheckCircle
                                size={18}
                              />

                              {isLoading
                                ? 'Marking...'
                                : 'Attend Event'}
                            </button>
                          )}
                        </>
                      )}

                      {/* ---------------------------------------------
                          COMPLETED
                      --------------------------------------------- */}

                      {eventStatus ===
                        'Completed' && (
                        <>
                          {isAttended ? (
                            <div className="flex-1 px-4 py-2 rounded-lg bg-green-50 text-green-700 font-bold flex items-center justify-center gap-2">
                              <Award size={18} />

                              Certificate Available
                            </div>
                          ) : (
                            <div className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-500 font-semibold text-center">
                              Event completed
                            </div>
                          )}
                        </>
                      )}

                      {/* ---------------------------------------------
                          CANCELLED
                      --------------------------------------------- */}

                      {eventStatus ===
                        'Cancelled' && (
                        <div className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-500 font-semibold text-center">
                          Event cancelled
                        </div>
                      )}

                      {/* ---------------------------------------------
                          ADMIN DELETE
                      --------------------------------------------- */}

                      {user?.role ===
                        'admin' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteEvent(
                              event._id
                            )
                          }
                          className="btn-secondary px-3"
                          aria-label={`Delete ${event.title}`}
                        >
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

              <Search
                size={40}
                className="mx-auto mb-4 text-slate-300"
              />

              <p className="text-lg font-bold text-slate-500">
                No events found.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Try changing your search or filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary mt-5"
              >
                Clear filters
              </button>

            </div>
          )}

        </div>
      </main>

      {/* =====================================================
          REGISTER MODAL
      ===================================================== */}

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