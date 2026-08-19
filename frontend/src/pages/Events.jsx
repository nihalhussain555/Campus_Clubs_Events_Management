import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Users,
  Search,
  CheckCircle,
  Clock
} from 'lucide-react';

import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';
import RegisterEventModal from '../components/RegisterEventModal';

import { clubAPI, eventAPI } from '../services/api';


const Events = () => {

  // =====================================================
  // STATE
  // =====================================================

  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const [showRegisterModal, setShowRegisterModal] =
    useState(false);

  const [registeringEvent, setRegisteringEvent] =
    useState(false);

  const [actionLoadingIds, setActionLoadingIds] =
    useState([]);

  const [showForm, setShowForm] =
    useState(false);

  // Search
  const [search, setSearch] =
    useState('');

  // Filters
  const [statusFilter, setStatusFilter] =
    useState('all');

  const [categoryFilter, setCategoryFilter] =
    useState('all');

  const [clubFilter, setClubFilter] =
    useState('all');

  const [sortBy, setSortBy] =
    useState('date');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    category: 'General',
    club: '',
    capacity: 120
  });

  const user =
    JSON.parse(localStorage.getItem('user') || '{}');


  // =====================================================
  // FETCH EVENTS
  // =====================================================

  const fetchEvents = async () => {
    try {
      const response =
        await eventAPI.getAllEvents();

      setEvents(
        response.data.events || []
      );
    } catch (error) {
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
      const response =
        await clubAPI.getAllClubs();

      setClubs(
        response.data.clubs || []
      );
    } catch {
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

    if (
      event.status?.toLowerCase() ===
      'cancelled'
    ) {
      return 'Cancelled';
    }

    const now = new Date();

    const start =
      new Date(event.date);

    const end =
      new Date(event.endDate);

    if (now < start) {
      return 'Upcoming';
    }

    if (
      now >= start &&
      now <= end
    ) {
      return 'Ongoing';
    }

    return 'Finished';
  };


  // =====================================================
  // USER REGISTRATION
  // =====================================================

  const isUserRegistered = (event) => {

    const userId =
      user?.id || user?._id;

    if (!userId) return false;

    return (
      event.registeredStudents || []
    ).some((student) => {

      const id =
        typeof student === 'string'
          ? student
          : student?._id ||
            student?.id;

      return (
        String(id) ===
        String(userId)
      );
    });
  };


  // =====================================================
  // USER ATTENDANCE
  // =====================================================

  const isUserAttended = (event) => {

    const userId =
      user?.id || user?._id;

    if (!userId) return false;

    return (
      event.participants || []
    ).some((participant) => {

      const id =
        typeof participant === 'string'
          ? participant
          : participant?._id ||
            participant?.id;

      return (
        String(id) ===
        String(userId)
      );
    });
  };


  // =====================================================
  // REGISTER
  // =====================================================

  const handleConfirmRegister = async () => {

    if (!selectedEvent) return;

    const eventId =
      selectedEvent._id;

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

      await eventAPI.registerForEvent(
        eventId
      );

      setToast({
        message:
          'Successfully registered for event',
        type: 'success'
      });

      setShowRegisterModal(false);
      setSelectedEvent(null);

      await fetchEvents();

    } catch (error) {

      setToast({
        message:
          error.response?.data?.message ||
          'Registration failed',
        type: 'error'
      });

    } finally {

      setRegisteringEvent(false);

      setActionLoadingIds((ids) =>
        ids.filter(
          (id) => id !== eventId
        )
      );
    }
  };


  // =====================================================
  // UNREGISTER
  // =====================================================

  const handleUnregisterEvent =
    async (eventId) => {

      if (
        !window.confirm(
          'Are you sure you want to unregister from this event?'
        )
      ) {
        return;
      }

      try {

        setActionLoadingIds((ids) => [
          ...ids,
          eventId
        ]);

        await eventAPI.unregisterFromEvent(
          eventId
        );

        setToast({
          message:
            'Successfully unregistered',
          type: 'success'
        });

        await fetchEvents();

      } catch (error) {

        setToast({
          message:
            error.response?.data?.message ||
            'Error unregistering',
          type: 'error'
        });

      } finally {

        setActionLoadingIds((ids) =>
          ids.filter(
            (id) => id !== eventId
          )
        );
      }
    };


  // =====================================================
  // ATTEND EVENT
  // =====================================================

  const handleAttendEvent =
    async (eventId) => {

      if (
        actionLoadingIds.includes(eventId)
      ) {
        return;
      }

      try {

        setActionLoadingIds((ids) => [
          ...ids,
          eventId
        ]);

        const response =
          await eventAPI.attendEvent(
            eventId
          );

        setToast({
          message:
            response.data?.message ||
            'Attendance marked successfully. Certificate generated.',
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
          ids.filter(
            (id) => id !== eventId
          )
        );
      }
    };


  // =====================================================
  // CREATE EVENT
  // =====================================================

  const handleCreateEvent =
    async (e) => {

      e.preventDefault();

      if (
        !formData.title ||
        !formData.description ||
        !formData.date ||
        !formData.endDate ||
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
        new Date(formData.endDate) <=
        new Date(formData.date)
      ) {
        setToast({
          message:
            'End date/time must be after start date/time',
          type: 'error'
        });

        return;
      }

      try {

        await eventAPI.createEvent(
          formData
        );

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
          category: 'General',
          club: '',
          capacity: 120
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

  const handleDeleteEvent =
    async (eventId) => {

      if (
        !window.confirm(
          'Are you sure you want to delete this event?'
        )
      ) {
        return;
      }

      try {

        await eventAPI.deleteEvent(
          eventId
        );

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

  const formatDate = (dateString) => {

    if (!dateString) {
      return 'TBD';
    }

    return new Date(
      dateString
    ).toLocaleString(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    );
  };


  // =====================================================
  // FILTER EVENTS
  // =====================================================

  const filteredEvents =
    useMemo(() => {

      let result =
        [...events];

      // SEARCH
      if (search.trim()) {

        const query =
          search
            .toLowerCase()
            .trim();

        result =
          result.filter((event) => {

            const title =
              event.title
                ?.toLowerCase() || '';

            const description =
              event.description
                ?.toLowerCase() || '';

            const location =
              event.location
                ?.toLowerCase() || '';

            const category =
              event.category
                ?.toLowerCase() || '';

            const clubName =
              event.club?.clubName
                ?.toLowerCase() || '';

            return (
              title.includes(query) ||
              description.includes(query) ||
              location.includes(query) ||
              category.includes(query) ||
              clubName.includes(query)
            );
          });
      }

      // STATUS
      if (
        statusFilter !== 'all'
      ) {

        result =
          result.filter(
            (event) =>
              getEventStatus(event)
                .toLowerCase() ===
              statusFilter
          );
      }

      // CATEGORY
      if (
        categoryFilter !== 'all'
      ) {

        result =
          result.filter(
            (event) =>
              (
                event.category ||
                'General'
              ) === categoryFilter
          );
      }

      // CLUB
      if (
        clubFilter !== 'all'
      ) {

        result =
          result.filter(
            (event) =>
              event.club?._id ===
              clubFilter ||
              event.club ===
              clubFilter
          );
      }

      // SORT
      result.sort((a, b) => {

        if (sortBy === 'date') {

          return (
            new Date(a.date) -
            new Date(b.date)
          );
        }

        if (sortBy === 'newest') {

          return (
            new Date(b.createdAt || b.date) -
            new Date(a.createdAt || a.date)
          );
        }

        if (sortBy === 'title') {

          return a.title.localeCompare(
            b.title
          );
        }

        return 0;
      });

      return result;

    }, [
      events,
      search,
      statusFilter,
      categoryFilter,
      clubFilter,
      sortBy
    ]);


  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories =
    [
      ...new Set(
        events.map(
          (event) =>
            event.category ||
            'General'
        )
      )
    ];


  if (loading) {
    return (
      <LoadingScreen
        message="Loading events..."
      />
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
          onClose={() =>
            setToast(null)
          }
        />
      )}

      <main className="page-section pt-8">

        <div className="page-container">

          {/* HEADER */}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <span className="eyebrow">
                Campus calendar
              </span>

              <h1 className="display-title text-4xl sm:text-5xl">
                All events
              </h1>

              <p className="section-copy mt-4">
                Discover campus events, register,
                attend and earn certificates.
              </p>

            </div>

            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    (value) => !value
                  )
                }
                className="btn-primary"
              >
                <Plus size={18} />

                {showForm
                  ? 'Close'
                  : 'Create event'}
              </button>
            )}

          </div>


          {/* CREATE EVENT */}

          {showForm &&
            user?.role === 'admin' && (

              <form
                onSubmit={
                  handleCreateEvent
                }
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
                      value={
                        formData.title
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title:
                            e.target.value
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
                      value={
                        formData.club
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          club:
                            e.target.value
                        })
                      }
                      className="field"
                      required
                    >

                      <option value="">
                        Select a club
                      </option>

                      {clubs.map(
                        (club) => (

                          <option
                            key={
                              club._id
                            }
                            value={
                              club._id
                            }
                          >
                            {
                              club.clubName
                            }
                          </option>

                        )
                      )}

                    </select>

                  </div>

                </div>


                <div>

                  <label className="field-label">
                    Description *
                  </label>

                  <textarea
                    value={
                      formData.description
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description:
                          e.target.value
                      })
                    }
                    className="field min-h-28"
                    placeholder="Describe the event"
                    required
                  />

                </div>


                {/* START + END */}

                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="field-label">
                      Start date & time *
                    </label>

                    <input
                      type="datetime-local"
                      value={ formData.date }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          date:
                            e.target.value
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
                      value={
                        formData.endDate
                      }
                      min={
                        formData.date ||
                        undefined
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          endDate:
                            e.target.value
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
                      value={
                        formData.location
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          location:
                            e.target.value
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
                      value={
                        formData.category
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category:
                            e.target.value
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
                      value={
                        formData.capacity
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity:
                            Number(
                              e.target.value
                            )
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


          {/* SEARCH + FILTER */}

          <div className="app-card mb-8">

            <div className="flex items-center gap-2 mb-5">

              <Search
                size={20}
                className="text-[#145f82]"
              />

              <h2 className="text-xl font-black">
                Find events
              </h2>

            </div>


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

              <div className="lg:col-span-2">

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  className="field"
                  placeholder="Search events..."
                />

              </div>


              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
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

                <option value="finished">
                  Finished
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

              </select>


              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }
                className="field"
              >

                <option value="all">
                  All categories
                </option>

                {categories.map(
                  (category) => (

                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>

                  )
                )}

              </select>


              <select
                value={clubFilter}
                onChange={(e) =>
                  setClubFilter(
                    e.target.value
                  )
                }
                className="field"
              >

                <option value="all">
                  All clubs
                </option>

                {clubs.map(
                  (club) => (

                    <option
                      key={club._id}
                      value={club._id}
                    >
                      {
                        club.clubName
                      }
                    </option>

                  )
                )}

              </select>

            </div>


            <div className="mt-4 flex flex-col sm:flex-row gap-3">

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value
                  )
                }
                className="field sm:w-52"
              >

                <option value="date">
                  Sort by date
                </option>

                <option value="newest">
                  Newest
                </option>

                <option value="title">
                  Title
                </option>

              </select>


              <button
                type="button"
                onClick={() => {

                  setSearch('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setClubFilter('all');
                  setSortBy('date');

                }}
                className="btn-secondary"
              >
                Clear filters
              </button>

            </div>

          </div>


          {/* EVENT COUNT */}

          <div className="mb-5">

            <p className="text-sm font-bold text-slate-500">
              {filteredEvents.length}{' '}
              event
              {filteredEvents.length !== 1
                ? 's'
                : ''}{' '}
              found
            </p>

          </div>


          {/* EVENTS */}

          {filteredEvents.length > 0 ? (

            <div className="grid gap-5 lg:grid-cols-2">

              {filteredEvents.map(
                (event) => {

                  const status =
                    getEventStatus(
                      event
                    );

                  const registered =
                    isUserRegistered(
                      event
                    );

                  const attended =
                    isUserAttended(
                      event
                    );

                  const full =
                    (
                      event.registeredStudents
                        ?.length || 0
                    ) >=
                    event.capacity;

                  const loadingAction =
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
                            {
                              event.description
                            }
                          </p>

                        </div>


                        <span
                          className={`chip ${
                            status ===
                            'Finished'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : status ===
                                'Ongoing'
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                              : status ===
                                'Cancelled'
                              ? 'bg-gray-100 text-gray-700 border border-gray-200'
                              : 'bg-green-100 text-green-700 border border-green-200'
                          }`}
                        >
                          {status}
                        </span>

                      </div>


                      {/* DETAILS */}

                      <div className="mb-5 grid gap-3 text-sm font-bold text-slate-600">

                        <div className="flex items-center gap-2">

                          <Calendar
                            size={17}
                            className="text-[#145f82]"
                          />

                          Start:{' '}
                          {formatDate(
                            event.date
                          )}

                        </div>


                        <div className="flex items-center gap-2">

                          <Clock
                            size={17}
                            className="text-[#145f82]"
                          />

                          End:{' '}
                          {formatDate(
                            event.endDate
                          )}

                        </div>


                        <div className="flex items-center gap-2">

                          <MapPin
                            size={17}
                            className="text-[#145f82]"
                          />

                          {
                            event.location ||
                            'To be announced'
                          }

                        </div>


                        <div className="flex items-center gap-2">

                          <Users
                            size={17}
                            className="text-[#145f82]"
                          />

                          {
                            event.registeredStudents
                              ?.length ||
                            0
                          }{' '}
                          /{' '}
                          {event.capacity}{' '}
                          registered

                        </div>

                      </div>


                      {/* ACTIONS */}

                      <div className="flex flex-wrap gap-2 mt-auto">


                        {/* REGISTER */}

                        {!registered &&
                          status ===
                            'Upcoming' && (

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
                                full ||
                                loadingAction
                              }
                              className="btn-primary flex-1"
                            >

                              {full
                                ? 'Full'
                                : 'Register'}

                            </button>

                          )}


                        {/* UNREGISTER */}

                        {registered &&
                          status ===
                            'Upcoming' && (

                            <button
                              type="button"
                              onClick={() =>
                                handleUnregisterEvent(
                                  event._id
                                )
                              }
                              disabled={
                                loadingAction
                              }
                              className="btn-danger flex-1"
                            >
                              Tap to unregister
                            </button>

                          )}


                        {/* ATTEND */}

                        {registered &&
                          status ===
                            'Ongoing' &&
                          !attended && (

                            <button
                              type="button"
                              onClick={() =>
                                handleAttendEvent(
                                  event._id
                                )
                              }
                              disabled={
                                loadingAction
                              }
                              className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >

                              <CheckCircle
                                size={18}
                              />

                              {loadingAction
                                ? 'Marking...'
                                : 'Attend'}

                            </button>

                          )}


                        {/* ATTENDED */}

                        {attended && (

                          <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-100 text-green-700 font-bold px-4 py-3">

                            <CheckCircle
                              size={18}
                            />

                            Attended

                          </div>

                        )}


                        {/* REGISTERED BUT EVENT NOT ONGOING */}

                        {registered &&
                          !attended &&
                          status ===
                            'Upcoming' && (

                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">

                              <Clock
                                size={14}
                              />

                              Attend button
                              appears when
                              event starts

                            </span>

                          )}


                        {/* ADMIN DELETE */}

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
                            <Trash2
                              size={18}
                            />
                          </button>

                        )}

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          ) : (

            <div className="app-card text-center">

              <p className="text-lg font-bold text-slate-500">
                No events match your filters.
              </p>

            </div>

          )}

        </div>

      </main>


      {/* REGISTER MODAL */}

      <RegisterEventModal
        event={selectedEvent}
        isOpen={
          showRegisterModal
        }
        onClose={() => {

          setShowRegisterModal(
            false
          );

          setSelectedEvent(
            null
          );

        }}
        onConfirm={
          handleConfirmRegister
        }
        loading={
          registeringEvent
        }
      />

    </div>
  );
};

export default Events;