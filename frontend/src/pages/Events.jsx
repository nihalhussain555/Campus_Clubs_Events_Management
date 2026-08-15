import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  History,
  CheckCircle,
  XCircle
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [eventView, setEventView] = useState('upcoming');

  // =====================================================
  // CALENDAR
  // =====================================================

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // =====================================================
  // ADMIN FORM
  // =====================================================

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    club: '',
    capacity: 120,
    category: 'General'
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // =====================================================
  // FETCH EVENTS
  // =====================================================

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const response = await eventAPI.getAllEvents();

      const fetchedEvents = response.data.events || [];

      setEvents(fetchedEvents);

      // Find events registered by current user
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
                  : student?._id || student?.id;

              return studentId === userId;
            })
          )
          .map((event) => event._id);

        setRegisteredEventIds(ids);
      } else {
        setRegisteredEventIds([]);
      }
    } catch (error) {
      console.error(error);

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
      console.error(error);
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
    const eventDate = new Date(event.date);

    if (event.status?.toLowerCase() === 'cancelled') {
      return 'Cancelled';
    }

    if (event.status?.toLowerCase() === 'ongoing') {
      return 'Ongoing';
    }

    if (eventDate < now) {
      return 'Finished';
    }

    return 'Upcoming';
  };

  // =====================================================
  // SEARCH + FILTER EVENTS
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

      const matchesStatus =
        statusFilter === 'all' ||
        status.toLowerCase() === statusFilter.toLowerCase();

      const matchesClub =
        clubFilter === 'all' ||
        event.club?._id === clubFilter ||
        event.club === clubFilter;

      const matchesCategory =
        categoryFilter === 'all' ||
        event.category === categoryFilter;

      let matchesView = true;

      const eventDate = new Date(event.date);
      const now = new Date();

      if (eventView === 'upcoming') {
        matchesView =
          eventDate >= now &&
          status !== 'Cancelled';
      }

      if (eventView === 'history') {
        matchesView =
          eventDate < now ||
          status === 'Finished';
      }

      if (eventView === 'all') {
        matchesView = true;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClub &&
        matchesCategory &&
        matchesView
      );
    });
  }, [
    events,
    searchTerm,
    statusFilter,
    clubFilter,
    categoryFilter,
    eventView
  ]);

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = useMemo(() => {
    return [
      ...new Set(
        events
          .map((event) => event.category)
          .filter(Boolean)
      )
    ];
  }, [events]);

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
        message: 'Please fill all required fields',
        type: 'error'
      });

      return;
    }

    if (
      formData.endDate &&
      new Date(formData.endDate) <=
        new Date(formData.date)
    ) {
      setToast({
        message:
          'End date must be after the start date',
        type: 'error'
      });

      return;
    }

    try {
      await eventAPI.createEvent({
        title: formData.title,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        club: formData.club,
        capacity: formData.capacity,
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
        category: 'General'
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
        message: 'Error deleting event',
        type: 'error'
      });
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString) => {
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
  // CALENDAR HELPERS
  // =====================================================

  const monthName = new Date(
    currentYear,
    currentMonth
  ).toLocaleString('en-US', {
    month: 'long'
  });

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentYear,
    currentMonth,
    1
  ).getDay();

  const daysArray = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  const blanksArray = Array.from(
    { length: firstDayOfMonth },
    (_, index) => index
  );

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth(
        (month) => month - 1
      );
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth(
        (month) => month + 1
      );
    }
  };

  const goToToday = () => {
    const now = new Date();

    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const getEventsForCalendarDay = (day) => {
    return events.filter((event) => {
      const date = new Date(event.date);

      return (
        date.getDate() === day &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
  };

  const isToday = (day) => {
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  // =====================================================
  // CALENDAR DAY CLICK
  // =====================================================

  const handleCalendarDayClick = (day) => {
    const dayEvents =
      getEventsForCalendarDay(day);

    setSelectedCalendarDate({
      day,
      events: dayEvents
    });
  };

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

          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="eyebrow">
                Campus calendar
              </span>

              <h1 className="display-title text-4xl sm:text-5xl">
                Events
              </h1>

              <p className="section-copy mt-4">
                Discover events, search activities,
                register and track your event history.
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

          {/* =====================================================
              SEARCH + FILTER
          ===================================================== */}

          <div className="app-card mb-8">
            <div className="flex items-center gap-2 mb-5">
              <Filter
                size={20}
                className="text-[#145f82]"
              />

              <h2 className="font-black text-xl text-black">
                Find events
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">

              {/* Search */}

              <div className="lg:col-span-2 relative">
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
                  placeholder="Search events..."
                  className="field pl-10"
                />
              </div>

              {/* View */}

              <select
                value={eventView}
                onChange={(e) =>
                  setEventView(e.target.value)
                }
                className="field"
              >
                <option value="upcoming">
                  Upcoming Events
                </option>

                <option value="history">
                  Event History
                </option>

                <option value="all">
                  All Events
                </option>
              </select>

              {/* Status */}

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="field"
              >
                <option value="all">
                  All Status
                </option>

                <option value="upcoming">
                  Upcoming
                </option>

                <option value="ongoing">
                  Ongoing
                </option>

                <option value="finished">
                  Finished
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>

              {/* Club */}

              <select
                value={clubFilter}
                onChange={(e) =>
                  setClubFilter(e.target.value)
                }
                className="field"
              >
                <option value="all">
                  All Clubs
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

            <div className="mt-4 flex flex-wrap gap-3">

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value)
                }
                className="field max-w-xs"
              >
                <option value="all">
                  All Categories
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

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setClubFilter('all');
                  setCategoryFilter('all');
                  setEventView('upcoming');
                }}
                className="btn-secondary"
              >
                Clear filters
              </button>

              <span className="flex items-center text-sm font-bold text-slate-500">
                {filteredEvents.length} event
                {filteredEvents.length !== 1
                  ? 's'
                  : ''}{' '}
                found
              </span>
            </div>
          </div>

          {/* =====================================================
              CREATE EVENT
          ===================================================== */}

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
                    min={
                      formData.date || undefined
                    }
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

          {/* =====================================================
              CALENDAR
          ===================================================== */}

          <div className="app-card mb-8">

            <div className="flex flex-col gap-4 mb-6">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-[#eef8fc] flex items-center justify-center">
                    <Calendar
                      size={21}
                      className="text-[#145f82]"
                    />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-black">
                      Event Calendar
                    </h2>

                    <p className="text-sm text-slate-500">
                      Click a date to view events
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={goToToday}
                  className="btn-secondary"
                >
                  Today
                </button>

              </div>

              {/* Calendar navigation */}

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">

                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="btn-secondary px-3"
                >
                  <ChevronLeft size={18} />
                </button>

                <h3 className="text-xl font-black text-black">
                  {monthName} {currentYear}
                </h3>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="btn-secondary px-3"
                >
                  <ChevronRight size={18} />
                </button>

              </div>

            </div>

            {/* Calendar */}

            <div className="overflow-x-auto">

              <div className="min-w-[700px]">

                {/* Week names */}

                <div className="grid grid-cols-7 gap-2 mb-2">

                  {[
                    'Sun',
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat'
                  ].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-black text-slate-500 py-2"
                    >
                      {day}
                    </div>
                  ))}

                </div>

                {/* Days */}

                <div className="grid grid-cols-7 gap-2">

                  {blanksArray.map((blank) => (
                    <div
                      key={`blank-${blank}`}
                      className="min-h-[110px] rounded-xl bg-slate-50 border border-slate-100"
                    />
                  ))}

                  {daysArray.map((day) => {

                    const dayEvents =
                      getEventsForCalendarDay(day);

                    return (
                      <button
                        type="button"
                        key={`day-${day}`}
                        onClick={() =>
                          handleCalendarDayClick(day)
                        }
                        className={`
                          min-h-[110px]
                          p-2
                          rounded-xl
                          text-left
                          border
                          transition-all
                          hover:shadow-md
                          hover:-translate-y-0.5
                          ${
                            isToday(day)
                              ? 'border-[#145f82] ring-1 ring-[#145f82]'
                              : 'border-slate-200'
                          }
                          bg-white
                        `}
                      >

                        <div
                          className={`
                            w-7 h-7
                            rounded-full
                            flex items-center justify-center
                            text-sm font-black
                            ${
                              isToday(day)
                                ? 'bg-[#145f82] text-white'
                                : 'text-slate-700'
                            }
                          `}
                        >
                          {day}
                        </div>

                        <div className="mt-2 space-y-1">

                          {dayEvents
                            .slice(0, 3)
                            .map((event) => (
                              <div
                                key={event._id}
                                title={event.title}
                                className="text-[10px] sm:text-xs p-1 rounded-md bg-[#eef8fc] text-[#145f82] truncate font-bold"
                              >
                                {event.title}
                              </div>
                            ))}

                          {dayEvents.length > 3 && (
                            <div className="text-[10px] font-bold text-slate-400">
                              +{dayEvents.length - 3} more
                            </div>
                          )}

                        </div>

                      </button>
                    );
                  })}

                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              EVENT HISTORY QUICK SUMMARY
          ===================================================== */}

          <div className="grid gap-4 md:grid-cols-3 mb-8">

            <div className="app-card">
              <div className="flex items-center gap-4">

                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar
                    size={21}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-500 font-bold">
                    Total Events
                  </p>

                  <p className="text-2xl font-black">
                    {events.length}
                  </p>
                </div>

              </div>
            </div>

            <div className="app-card">
              <div className="flex items-center gap-4">

                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle
                    size={21}
                    className="text-green-600"
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-500 font-bold">
                    Registered
                  </p>

                  <p className="text-2xl font-black">
                    {registeredEventIds.length}
                  </p>
                </div>

              </div>
            </div>

            <div className="app-card">
              <div className="flex items-center gap-4">

                <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                  <History
                    size={21}
                    className="text-purple-600"
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-500 font-bold">
                    Event History
                  </p>

                  <p className="text-2xl font-black">
                    {
                      events.filter(
                        (event) =>
                          getEventStatus(event) ===
                          'Finished'
                      ).length
                    }
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* =====================================================
              EVENT LIST
          ===================================================== */}

          {filteredEvents.length > 0 ? (

            <div className="grid gap-5 lg:grid-cols-2">

              {filteredEvents.map((event) => {

                const isRegistered =
                  registeredEventIds.includes(
                    event._id
                  );

                const isFull =
                  (event.registeredStudents
                    ?.length || 0) >=
                  event.capacity;

                const eventStatus =
                  getEventStatus(event);

                const isActionLoading =
                  actionLoadingIds.includes(
                    event._id
                  );

                const participantIds =
                  event.participants || [];

                const currentUserId =
                  user?.id || user?._id;

                const hasAttended =
                  participantIds.some(
                    (participant) => {
                      const id =
                        typeof participant ===
                        'string'
                          ? participant
                          : participant?._id ||
                            participant?.id;

                      return id === currentUserId;
                    }
                  );

                return (
                  <article
                    key={event._id}
                    className="app-card app-card-hover"
                  >

                    {/* Header */}

                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <div className="flex flex-wrap gap-2 mb-2">

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
                        className={`
                          chip
                          ${
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
                          }
                        `}
                      >
                        {eventStatus}
                      </span>

                    </div>

                    {/* Event information */}

                    <div className="mb-5 grid gap-3 text-sm font-bold text-slate-600">

                      <div className="flex items-center gap-2">
                        <Calendar
                          size={17}
                          className="text-[#145f82]"
                        />

                        {formatDate(event.date)}
                      </div>

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

                    </div>

                    {/* Attendance */}

                    {eventStatus === 'Finished' &&
                      isRegistered && (
                        <div
                          className={`
                            mb-5 p-3 rounded-xl
                            flex items-center gap-2
                            text-sm font-bold
                            ${
                              hasAttended
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-50 text-slate-500'
                            }
                          `}
                        >
                          {hasAttended ? (
                            <>
                              <CheckCircle size={17} />
                              Attendance recorded
                            </>
                          ) : (
                            <>
                              <XCircle size={17} />
                              Attendance not recorded
                            </>
                          )}
                        </div>
                      )}

                    {/* Actions */}

                    <div className="flex flex-wrap gap-2 mt-auto">

                      {eventStatus ===
                      'Upcoming' ? (
                        isRegistered ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUnregisterEvent(
                                event._id
                              )
                            }
                            className="btn-danger flex-1 whitespace-nowrap"
                          >
                            {isActionLoading
                              ? 'Processing...'
                              : 'Tap to unregister'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              isFull ||
                              isActionLoading
                            }
                            onClick={() => {
                              setSelectedEvent(
                                event
                              );
                              setShowRegisterModal(
                                true
                              );
                            }}
                            className="btn-primary flex-1"
                          >
                            {isFull
                              ? 'Full'
                              : 'Register'}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="btn-secondary flex-1 opacity-70"
                        >
                          {eventStatus}
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

              <Calendar
                size={40}
                className="mx-auto mb-4 text-slate-300"
              />

              <h3 className="text-xl font-black text-slate-700">
                No events found
              </h3>

              <p className="mt-2 text-slate-500">
                Try changing your search or filters.
              </p>

            </div>
          )}

        </div>
      </main>

      {/* =====================================================
          CALENDAR DAY MODAL
      ===================================================== */}

      {selectedCalendarDate && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">

          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-5">

              <div>
                <h2 className="text-xl font-black">
                  Events on{' '}
                  {monthName}{' '}
                  {selectedCalendarDate.day},
                  {' '}
                  {currentYear}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {
                    selectedCalendarDate.events
                      .length
                  }{' '}
                  event
                  {selectedCalendarDate.events
                    .length !== 1
                    ? 's'
                    : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCalendarDate(null)
                }
                className="btn-secondary px-3"
              >
                ×
              </button>

            </div>

            {selectedCalendarDate.events
              .length > 0 ? (

              <div className="space-y-3">

                {selectedCalendarDate.events.map(
                  (event) => (
                    <div
                      key={event._id}
                      className="border border-slate-200 rounded-xl p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>
                          <h3 className="font-black text-lg">
                            {event.title}
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            {formatDate(
                              event.date
                            )}
                          </p>

                          <p className="text-sm text-slate-500">
                            {event.location ||
                              'Location TBD'}
                          </p>
                        </div>

                        <span className="chip bg-[#eef8fc] text-[#145f82]">
                          {getEventStatus(
                            event
                          )}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(
                            event
                          );
                          setSelectedCalendarDate(
                            null
                          );
                        }}
                        className="btn-secondary mt-4 w-full"
                      >
                        View event
                      </button>

                    </div>
                  )
                )}

              </div>

            ) : (

              <div className="text-center py-8">

                <Calendar
                  size={36}
                  className="mx-auto text-slate-300 mb-3"
                />

                <p className="font-bold text-slate-500">
                  No events scheduled for this day.
                </p>

              </div>
            )}

          </div>
        </div>
      )}

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