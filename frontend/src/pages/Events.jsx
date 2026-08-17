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
  Award
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

  const [showForm, setShowForm] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [registeringEvent, setRegisteringEvent] = useState(false);

  const [actionLoadingIds, setActionLoadingIds] = useState([]);

  // =====================================================
  // SEARCH / FILTER STATE
  // =====================================================

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // =====================================================
  // CREATE EVENT FORM
  // =====================================================

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

      const fetchedEvents = response.data.events || [];

      setEvents(fetchedEvents);

      // Find registered events for current user
      const currentUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      const userId = currentUser?.id || currentUser?._id;

      if (userId) {
        const ids = fetchedEvents
          .filter((event) =>
            (event.registeredStudents || []).some((student) => {
              if (typeof student === 'string') {
                return student === userId;
              }

              return (
                student?._id === userId ||
                student?.id === userId
              );
            })
          )
          .map((event) => event._id);

        setRegisteredEventIds(ids);
      } else {
        setRegisteredEventIds([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);

      setToast({
        message: 'Error loading events',
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

      setClubs(response.data.clubs || []);
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
  // GET EVENT STATUS
  // =====================================================

  const getEventStatus = (event) => {
    const now = new Date();

    const startTime = new Date(event.date);

    /*
      IMPORTANT:
      endDate must exist in the event.
    */

    const endTime = event.endDate
      ? new Date(event.endDate)
      : new Date(startTime.getTime() + 60 * 60 * 1000);

    // Admin manually cancelled
    if (event.status?.toLowerCase() === 'cancelled') {
      return 'Cancelled';
    }

    // Before start
    if (now < startTime) {
      return 'Upcoming';
    }

    // Between start and end
    if (now >= startTime && now <= endTime) {
      return 'Ongoing';
    }

    // After end
    if (now > endTime) {
      return 'Finished';
    }

    return 'Upcoming';
  };

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const categories = useMemo(() => {
    const uniqueCategories = events
      .map((event) => event.category)
      .filter(Boolean);

    return ['all', ...new Set(uniqueCategories)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const status = getEventStatus(event);

      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        event.title?.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.location?.toLowerCase().includes(search) ||
        event.category?.toLowerCase().includes(search) ||
        event.club?.clubName?.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === 'all' ||
        event.category === categoryFilter;

      const matchesClub =
        clubFilter === 'all' ||
        event.club?._id === clubFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        status === statusFilter;

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
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setClubFilter('all');
    setStatusFilter('all');
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

  const handleAttendEvent = async (eventId) => {
    if (actionLoadingIds.includes(eventId)) {
      return;
    }

    try {
      setActionLoadingIds((ids) => [
        ...ids,
        eventId
      ]);

      /*
        Backend should:
        1. Verify student is registered
        2. Verify event is currently ongoing
        3. Add student to participants
        4. Generate/enable certificate
      */

      await eventAPI.attendEvent(eventId);

      setToast({
        message:
          'Attendance marked successfully. Your certificate is now available.',
        type: 'success'
      });

      await fetchEvents();
    } catch (error) {
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

    const startDate = new Date(formData.date);
    const endDate = new Date(formData.endDate);

    if (endDate <= startDate) {
      setToast({
        message:
          'End date and time must be after start date and time',
        type: 'error'
      });

      return;
    }

    try {
      await eventAPI.createEvent({
        title: formData.title,
        description: formData.description,
        date: formData.date,
        endDate: formData.endDate,
        location: formData.location,
        club: formData.club,
        capacity: Number(formData.capacity),
        category: formData.category
      });

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

    return new Date(dateString).toLocaleString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
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
                Register for activities, attend ongoing
                events and track your event history.
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
              CREATE EVENT
          ================================================= */}

          {showForm &&
            user?.role === 'admin' && (
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

                {/* DATE / TIME */}

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
                      min={
                        formData.date ||
                        undefined
                      }
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

                {/* LOCATION / CAPACITY */}

                <div className="grid gap-5 md:grid-cols-2">

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

                </div>

                {/* CATEGORY */}

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
                    placeholder="Technical, Cultural, Sports..."
                  />
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
              SEARCH + FILTER
          ================================================= */}

          <div className="app-card mb-8">

            <div className="mb-5 flex items-center gap-2">

              <Filter
                size={20}
                className="text-[#145f82]"
              />

              <h2 className="text-xl font-black text-black">
                Find events
              </h2>

            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              {/* SEARCH */}

              <div className="relative">

                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  className="field pl-10"
                  placeholder="Search events..."
                />

              </div>

              {/* CATEGORY */}

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

                {categories
                  .filter(
                    (category) =>
                      category !== 'all'
                  )
                  .map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}

              </select>

              {/* CLUB */}

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

              {/* STATUS */}

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="field"
              >

                <option value="all">
                  All statuses
                </option>

                <option value="Upcoming">
                  Upcoming
                </option>

                <option value="Ongoing">
                  Ongoing
                </option>

                <option value="Finished">
                  Finished
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>

              </select>

            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

              <p className="text-sm font-semibold text-slate-500">
                Showing {filteredEvents.length} of{' '}
                {events.length} events
              </p>

              {(searchTerm ||
                categoryFilter !== 'all' ||
                clubFilter !== 'all' ||
                statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary"
                >
                  Clear filters
                </button>
              )}

            </div>

          </div>

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

                const isFull =
                  (event.registeredStudents?.length ||
                    0) >= event.capacity;

                const eventStatus =
                  getEventStatus(event);

                /*
                  ATTEND IS AVAILABLE ONLY WHEN:
                  1. User is registered
                  2. Event is ongoing
                  3. Event is not cancelled
                */

                const canAttend =
                  isRegistered &&
                  eventStatus === 'Ongoing' &&
                  event.status?.toLowerCase() !==
                    'cancelled';

                const isAttending =
                  (event.participants || []).some(
                    (participant) => {
                      const participantId =
                        typeof participant === 'string'
                          ? participant
                          : participant?._id ||
                            participant?.id;

                      const currentUserId =
                        user?.id || user?._id;

                      return (
                        participantId ===
                        currentUserId
                      );
                    }
                  );

                return (

                  <article
                    key={event._id}
                    className="app-card app-card-hover"
                  >

                    {/* EVENT HEADER */}

                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <div className="mb-2 flex flex-wrap gap-2">

                          {event.category && (
                            <span className="chip bg-slate-100 text-slate-700 border border-slate-200">
                              {event.category}
                            </span>
                          )}

                          {event.club?.clubName && (
                            <span className="chip bg-[#eef8fc] text-[#145f82] border border-[#d6edf5]">
                              {event.club.clubName}
                            </span>
                          )}

                        </div>

                        <h3 className="text-2xl font-black text-black">
                          {event.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {event.description}
                        </p>

                      </div>

                      {/* STATUS */}

                      <span
                        className={`chip whitespace-nowrap ${
                          eventStatus ===
                          'Finished'
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

                    {/* EVENT DETAILS */}

                    <div className="mb-5 grid gap-3 text-sm font-bold text-slate-600">

                      {/* START */}

                      <div className="flex items-center gap-2">

                        <Calendar
                          size={17}
                          className="text-[#145f82]"
                        />

                        <span>
                          Start:{' '}
                          {formatDate(event.date)}
                        </span>

                      </div>

                      {/* END */}

                      {event.endDate && (
                        <div className="flex items-center gap-2">

                          <Calendar
                            size={17}
                            className="text-[#145f82]"
                          />

                          <span>
                            End:{' '}
                            {formatDate(
                              event.endDate
                            )}
                          </span>

                        </div>
                      )}

                      {/* LOCATION */}

                      <div className="flex items-center gap-2">

                        <MapPin
                          size={17}
                          className="text-[#145f82]"
                        />

                        {event.location ||
                          'To be announced'}

                      </div>

                      {/* REGISTRATION */}

                      <div className="flex items-center gap-2">

                        <Users
                          size={17}
                          className="text-[#145f82]"
                        />

                        {event.registeredStudents
                          ?.length || 0}{' '}
                        / {event.capacity} registered

                      </div>

                    </div>

                    {/* ATTENDANCE INFO */}

                    {eventStatus === 'Ongoing' &&
                      isRegistered && (
                        <div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">

                          <div className="flex items-start gap-3">

                            <CheckCircle
                              size={20}
                              className="mt-0.5 text-yellow-600"
                            />

                            <div>

                              <p className="font-bold text-yellow-800">
                                Event is currently
                                ongoing
                              </p>

                              <p className="mt-1 text-sm text-yellow-700">
                                Mark your attendance
                                before the event
                                ends to receive
                                your certificate.
                              </p>

                            </div>

                          </div>

                        </div>
                      )}

                    {/* ALREADY ATTENDED */}

                    {isAttending && (
                      <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">

                        <div className="flex items-center gap-3">

                          <CheckCircle
                            size={20}
                            className="text-green-600"
                          />

                          <div>

                            <p className="font-bold text-green-800">
                              Attendance marked
                            </p>

                            <p className="text-sm text-green-700">
                              Your certificate is
                              available in
                              Certificates.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                    {/* ACTIONS */}

                    <div className="flex flex-wrap gap-2 mt-auto">

                      {/* REGISTER / UNREGISTER */}

                      {isRegistered ? (

                        <button
                          type="button"
                          onClick={() =>
                            handleUnregisterEvent(
                              event._id
                            )
                          }
                          disabled={
                            actionLoadingIds.includes(
                              event._id
                            ) ||
                            eventStatus ===
                              'Ongoing' ||
                            eventStatus ===
                              'Finished'
                          }
                          className="btn-danger flex-1 whitespace-nowrap text-xs sm:text-sm px-2"
                        >
                          {eventStatus ===
                            'Ongoing' ||
                          eventStatus ===
                            'Finished'
                            ? 'Registered'
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
                            eventStatus !==
                              'Upcoming'
                          }
                          className="btn-primary flex-1"
                        >
                          {isFull
                            ? 'Full'
                            : eventStatus ===
                              'Upcoming'
                            ? 'Register'
                            : 'Registration closed'}
                        </button>

                      )}

                      {/* =================================================
                          ATTEND BUTTON
                          AVAILABLE TO ALL REGISTERED USERS
                      ================================================= */}

                      {canAttend && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAttendEvent(
                              event._id
                            )
                          }
                          disabled={
                            actionLoadingIds.includes(
                              event._id
                            ) || isAttending
                          }
                          className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >

                          {actionLoadingIds.includes(
                            event._id
                          ) ? (
                            'Marking...'
                          ) : isAttending ? (
                            <>
                              <CheckCircle
                                size={17}
                              />
                              Attended
                            </>
                          ) : (
                            <>
                              <CheckCircle
                                size={17}
                              />
                              Attend
                            </>
                          )}

                        </button>
                      )}

                      {/* CERTIFICATE */}

                      {isAttending && (
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href =
                              '/certificates';
                          }}
                          className="btn-secondary flex items-center justify-center gap-2"
                        >
                          <Award size={17} />
                          Certificate
                        </button>
                      )}

                      {/* ADMIN DELETE */}

                      {user?.role === 'admin' && (
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
                size={35}
                className="mx-auto mb-3 text-slate-400"
              />

              <p className="text-lg font-bold text-slate-500">
                No events found.
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Try changing your search or
                filters.
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

      {/* =================================================
          REGISTER MODAL
      ================================================= */}

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