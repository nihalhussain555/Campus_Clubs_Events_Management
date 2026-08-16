import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Users,
  Search,
  Filter,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { clubAPI, eventAPI } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
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

  // =====================================================
  // PHASE 2 - SEARCH & FILTER
  // =====================================================

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const [showFilters, setShowFilters] = useState(false);

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

      const currentUser =
        JSON.parse(localStorage.getItem('user') || '{}');

      const userId = currentUser?.id || currentUser?._id;

      if (userId) {
        const ids = fetchedEvents
          .filter((event) =>
            (event.registeredStudents || []).some((student) => {
              const studentId =
                typeof student === 'string'
                  ? student
                  : student._id || student.id;

              return studentId === userId;
            })
          )
          .map((event) => event._id);

        setRegisteredEventIds(ids);
      } else {
        setRegisteredEventIds([]);
      }
    } catch (error) {
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
      setClubs([]);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchClubs();
  }, []);

  // =====================================================
  // EVENT STATUS
  // =====================================================

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.date);

    const end = event.endDate
      ? new Date(event.endDate)
      : start;

    if (event.status === 'cancelled') {
      return 'Cancelled';
    }

    if (event.status === 'completed') {
      return 'Completed';
    }

    if (now >= start && now <= end) {
      return 'Ongoing';
    }

    if (now > end) {
      return 'Completed';
    }

    return 'Upcoming';
  };

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const status = getEventStatus(event);

      const search = searchTerm.toLowerCase().trim();

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
        status.toLowerCase() === statusFilter;

      let matchesDate = true;

      const eventDate = new Date(event.date);
      const today = new Date();

      if (dateFilter === 'today') {
        matchesDate =
          eventDate.toDateString() === today.toDateString();
      }

      if (dateFilter === 'week') {
        const weekFromNow = new Date();

        weekFromNow.setDate(
          today.getDate() + 7
        );

        matchesDate =
          eventDate >= today &&
          eventDate <= weekFromNow;
      }

      if (dateFilter === 'month') {
        matchesDate =
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getFullYear() === today.getFullYear();
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesClub &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    events,
    searchTerm,
    categoryFilter,
    clubFilter,
    statusFilter,
    dateFilter
  ]);

  // =====================================================
  // FILTER OPTIONS
  // =====================================================

  const categories = [
    ...new Set(
      events
        .map((event) => event.category)
        .filter(Boolean)
    )
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setClubFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
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

    setActionLoadingIds((ids) => [
      ...ids,
      eventId
    ]);

    try {
      await eventAPI.unregisterFromEvent(eventId);

      setToast({
        message:
          'Successfully unregistered from event',
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
  // CREATE EVENT
  // =====================================================

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.description ||
      !formData.date ||
      !formData.club
    ) {
      setToast({
        message:
          'Please fill all required fields',
        type: 'error'
      });

      return;
    }

    if (
      formData.endDate &&
      new Date(formData.endDate) <
        new Date(formData.date)
    ) {
      setToast({
        message:
          'End date cannot be before start date',
        type: 'error'
      });

      return;
    }

    try {
      await eventAPI.createEvent(formData);

      setToast({
        message:
          'Event created successfully',
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
        message:
          'Event deleted successfully',
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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <LoadingScreen message="Loading events..." />
    );
  }

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
                Search, filter and register for campus events.
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
              SEARCH
          ================================================= */}

          <div className="app-card mb-6">

            <div className="flex flex-col gap-4 lg:flex-row">

              <div className="relative flex-1">

                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  className="field pl-11"
                  placeholder="Search events, clubs, categories or locations..."
                />

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFilters((value) => !value)
                }
                className="btn-secondary"
              >
                <Filter size={18} />
                Filters
              </button>

            </div>


            {/* FILTERS */}

            {showFilters && (
              <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">

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


                <div>

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
                      All statuses
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


                <div>

                  <label className="field-label">
                    Date
                  </label>

                  <select
                    value={dateFilter}
                    onChange={(e) =>
                      setDateFilter(e.target.value)
                    }
                    className="field"
                  >

                    <option value="all">
                      Any date
                    </option>

                    <option value="today">
                      Today
                    </option>

                    <option value="week">
                      Next 7 days
                    </option>

                    <option value="month">
                      This month
                    </option>

                  </select>

                </div>


                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="btn-secondary"
                  >
                    <X size={17} />
                    Clear filters
                  </button>

                </div>

              </div>
            )}

          </div>


          {/* RESULT COUNT */}

          <div className="mb-5 flex items-center justify-between">

            <p className="text-sm font-bold text-slate-500">

              Showing{' '}
              <span className="text-slate-900">
                {filteredEvents.length}
              </span>{' '}
              of{' '}
              <span className="text-slate-900">
                {events.length}
              </span>{' '}
              events

            </p>

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
                    End date & time
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

                const isFull =
                  (event.registeredStudents?.length || 0) >=
                  event.capacity;

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

                        <div className="mb-2 flex flex-wrap gap-2">

                          {event.category && (
                            <span className="chip bg-slate-100 text-slate-700">
                              {event.category}
                            </span>
                          )}

                          {event.club?.clubName && (
                            <span className="chip bg-[#eef8fc] text-[#145f82]">
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


                      <span
                        className={`chip ${
                          eventStatus === 'Completed'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : eventStatus === 'Ongoing'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : eventStatus === 'Cancelled'
                            ? 'bg-gray-100 text-gray-700 border border-gray-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}
                      >
                        {eventStatus}
                      </span>

                    </div>


                    {/* DETAILS */}

                    <div className="mb-5 grid gap-3 text-sm font-bold text-slate-600">

                      <div className="flex items-center gap-2">

                        <Calendar
                          size={17}
                          className="text-[#145f82]"
                        />

                        {formatDate(event.date)}

                      </div>


                      {event.endDate && (

                        <div className="flex items-center gap-2">

                          <Calendar
                            size={17}
                            className="text-[#145f82]"
                          />

                          Ends:{' '}
                          {formatDate(event.endDate)}

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

                        {event.registeredStudents?.length ||
                          0}{' '}
                        / {event.capacity}{' '}
                        registered

                      </div>

                    </div>


                    {/* ACTIONS */}

                    <div className="flex flex-wrap gap-2 mt-auto">

                      {isRegistered ? (

                        <button
                          type="button"
                          disabled={
                            isLoading ||
                            eventStatus === 'Completed' ||
                            eventStatus === 'Cancelled'
                          }
                          onClick={() =>
                            handleUnregisterEvent(
                              event._id
                            )
                          }
                          className="btn-danger flex-1 whitespace-nowrap text-xs sm:text-sm px-2 disabled:opacity-50"
                        >
                          {isLoading
                            ? 'Processing...'
                            : 'Tap to unregister'}
                        </button>

                      ) : (

                        <button
                          type="button"
                          disabled={
                            isFull ||
                            eventStatus === 'Completed' ||
                            eventStatus === 'Cancelled' ||
                            isLoading
                          }
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowRegisterModal(true);
                          }}
                          className="btn-primary flex-1 disabled:opacity-50"
                        >
                          {isFull
                            ? 'Full'
                            : eventStatus === 'Completed'
                            ? 'Completed'
                            : eventStatus === 'Cancelled'
                            ? 'Cancelled'
                            : 'Register'}
                        </button>

                      )}


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

            <div className="app-card text-center py-12">

              <Search
                size={40}
                className="mx-auto mb-4 text-slate-300"
              />

              <p className="text-lg font-bold text-slate-500">
                No events found
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