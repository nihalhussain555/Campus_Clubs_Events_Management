import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  authAPI,
  clubAPI,
  eventAPI,
  notificationAPI,
} from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');

  const [showClubForm, setShowClubForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const [newClub, setNewClub] = useState({
    clubName: '',
    description: '',
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    club: '',
    capacity: 100,
    category: 'General',
  });

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
  });

  // --------------------------------------------------
  // FETCH DATA
  // --------------------------------------------------

  const fetchAdminData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [
        usersRes,
        clubsRes,
        eventsRes,
        notificationsRes,
      ] = await Promise.all([
        authAPI.getAllUsers(),
        clubAPI.getAllClubs(),
        eventAPI.getAllEvents(),
        notificationAPI.getAllNotifications(),
      ]);

      setUsers(usersRes.data.users || []);
      setClubs(clubsRes.data.clubs || []);
      setEvents(eventsRes.data.events || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (error) {
      console.error('Admin data error:', error);

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load admin data',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData(true);
  }, []);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return 'Not available';

    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventStatus = (event) => {
    if (!event) return 'upcoming';

    const eventDate = new Date(event.date);
    const now = new Date();

    if (event.status?.toLowerCase() === 'cancelled') {
      return 'cancelled';
    }

    if (
      event.status?.toLowerCase() === 'completed' ||
      eventDate < now
    ) {
      return 'completed';
    }

    if (event.status?.toLowerCase() === 'ongoing') {
      return 'ongoing';
    }

    return 'upcoming';
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'ongoing':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';

      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const totalUsers = users.length;
  const totalClubs = clubs.length;
  const totalEvents = events.length;
  const totalAdmins = users.filter(
    (user) => user.role === 'admin'
  ).length;

  const upcomingEvents = events.filter(
    (event) => getEventStatus(event) === 'upcoming'
  );

  const completedEvents = events.filter(
    (event) => getEventStatus(event) === 'completed'
  );

  const ongoingEvents = events.filter(
    (event) => getEventStatus(event) === 'ongoing'
  );

  const totalRegistrations = events.reduce(
    (total, event) =>
      total + (event.registeredStudents?.length || 0),
    0
  );

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return users;

    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(value) ||
        user.email?.toLowerCase().includes(value) ||
        user.role?.toLowerCase().includes(value)
    );
  }, [users, search]);

  const filteredClubs = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return clubs;

    return clubs.filter(
      (club) =>
        club.clubName?.toLowerCase().includes(value) ||
        club.description?.toLowerCase().includes(value) ||
        club.category?.toLowerCase().includes(value)
    );
  }, [clubs, search]);

  const filteredEvents = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return events;

    return events.filter(
      (event) =>
        event.title?.toLowerCase().includes(value) ||
        event.description?.toLowerCase().includes(value) ||
        event.location?.toLowerCase().includes(value) ||
        event.club?.clubName?.toLowerCase().includes(value)
    );
  }, [events, search]);

  // --------------------------------------------------
  // DELETE CLUB
  // --------------------------------------------------

  const handleDeleteClub = async (clubId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this club? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await clubAPI.deleteClub(clubId);

      setToast({
        message: 'Club deleted successfully',
        type: 'success',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error deleting club',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // DELETE EVENT
  // --------------------------------------------------

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this event? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await eventAPI.deleteEvent(eventId);

      setToast({
        message: 'Event deleted successfully',
        type: 'success',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error deleting event',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // CREATE CLUB
  // --------------------------------------------------

  const handleCreateClub = async (e) => {
    e.preventDefault();

    if (!newClub.clubName.trim() || !newClub.description.trim()) {
      setToast({
        message: 'Please enter the club name and description',
        type: 'error',
      });
      return;
    }

    try {
      await clubAPI.createClub(newClub);

      setToast({
        message: 'Club created successfully',
        type: 'success',
      });

      setNewClub({
        clubName: '',
        description: '',
      });

      setShowClubForm(false);

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating club',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // CREATE EVENT
  // --------------------------------------------------

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (
      !newEvent.title.trim() ||
      !newEvent.description.trim() ||
      !newEvent.date ||
      !newEvent.club
    ) {
      setToast({
        message:
          'Please fill in all required event fields',
        type: 'error',
      });
      return;
    }

    try {
      await eventAPI.createEvent(newEvent);

      setToast({
        message: 'Event created successfully',
        type: 'success',
      });

      setNewEvent({
        title: '',
        description: '',
        date: '',
        location: '',
        club: '',
        capacity: 100,
        category: 'General',
      });

      setShowEventForm(false);

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating event',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // CREATE NOTIFICATION
  // --------------------------------------------------

  const handleCreateNotification = async (e) => {
    e.preventDefault();

    if (
      !newNotification.title.trim() ||
      !newNotification.message.trim()
    ) {
      setToast({
        message:
          'Please enter notification title and message',
        type: 'error',
      });
      return;
    }

    try {
      await notificationAPI.createNotification(
        newNotification
      );

      setToast({
        message: 'Notification sent successfully',
        type: 'success',
      });

      setNewNotification({
        title: '',
        message: '',
        type: 'info',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating notification',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // DASHBOARD DATA
  // --------------------------------------------------

  const recentUsers = [...users]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    )
    .slice(0, 5);

  const recentEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
    )
    .slice(0, 5);

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
    },
    {
      id: 'clubs',
      label: 'Clubs',
      icon: Briefcase,
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
    },
  ];

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <LoadingScreen message="Loading admin dashboard..." />
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="app-page min-h-screen">
      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="page-section pt-8 pb-16">
        <div className="page-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <section className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                    <Shield size={18} />
                  </span>

                  <span className="eyebrow">
                    Administration
                  </span>
                </div>

                <h1 className="display-title text-4xl sm:text-5xl">
                  Admin Dashboard
                </h1>

                <p className="section-copy mt-3 max-w-2xl">
                  Manage your campus clubs, events, users,
                  registrations, and notifications from one
                  central dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchAdminData(false)}
                disabled={refreshing}
                className="btn-secondary self-start lg:self-auto"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? 'animate-spin' : ''
                  }
                />
                Refresh
              </button>

            </div>
          </section>

          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-max gap-1">

              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearch('');
                    }}
                    className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                      active
                        ? 'bg-black text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-black'
                    }`}
                  >
                    <Icon size={17} />
                    {tab.label}
                  </button>
                );
              })}

            </div>
          </div>

          {/* ==================================================
              DASHBOARD
          ================================================== */}

          {activeTab === 'dashboard' && (
            <div className="space-y-8">

              {/* Statistics */}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Users
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalUsers}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Registered accounts
                      </p>
                    </div>

                    <span className="icon-tile">
                      <Users size={21} />
                    </span>
                  </div>
                </article>

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Clubs
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalClubs}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Active campus clubs
                      </p>
                    </div>

                    <span className="icon-tile">
                      <Briefcase size={21} />
                    </span>
                  </div>
                </article>

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Events
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalEvents}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {upcomingEvents.length} upcoming
                      </p>
                    </div>

                    <span className="icon-tile">
                      <Calendar size={21} />
                    </span>
                  </div>
                </article>

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Registrations
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalRegistrations}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Across all events
                      </p>
                    </div>

                    <span className="icon-tile">
                      <CheckCircle2 size={21} />
                    </span>
                  </div>
                </article>

              </div>

              {/* Event Summary */}

              <div className="grid gap-5 sm:grid-cols-3">

                <div className="app-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Clock size={19} />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Upcoming
                      </p>

                      <p className="text-2xl font-black text-black">
                        {upcomingEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="app-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Activity size={19} />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Ongoing
                      </p>

                      <p className="text-2xl font-black text-black">
                        {ongoingEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="app-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={19} />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Completed
                      </p>

                      <p className="text-2xl font-black text-black">
                        {completedEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Recent Users + Recent Events */}

              <div className="grid gap-6 lg:grid-cols-2">

                {/* Recent Users */}

                <section className="app-card">

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-black">
                        Recent Users
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Recently registered accounts
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="btn-secondary px-3"
                    >
                      View all
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <div className="space-y-3">

                    {recentUsers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        No users available.
                      </div>
                    ) : (
                      recentUsers.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                        >
                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                              {user.name
                                ?.charAt(0)
                                ?.toUpperCase() || 'U'}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-black">
                                {user.name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <span className="chip capitalize">
                            {user.role}
                          </span>
                        </div>
                      ))
                    )}

                  </div>
                </section>

                {/* Recent Events */}

                <section className="app-card">

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-black">
                        Recent Events
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Latest campus activities
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('events')}
                      className="btn-secondary px-3"
                    >
                      View all
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <div className="space-y-3">

                    {recentEvents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        No events available.
                      </div>
                    ) : (
                      recentEvents.map((event) => {
                        const status = getEventStatus(event);

                        return (
                          <div
                            key={event._id}
                            className="rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50"
                          >
                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">
                                <p className="truncate font-black text-black">
                                  {event.title}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(event.date)}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${getStatusClasses(
                                  status
                                )}`}
                              >
                                {status}
                              </span>

                            </div>
                          </div>
                        );
                      })
                    )}

                  </div>
                </section>

              </div>

            </div>
          )}

          {/* ==================================================
              USERS
          ================================================== */}

          {activeTab === 'users' && (
            <section className="space-y-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Users
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View all registered campus users.
                  </p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search users..."
                    className="field w-full pl-10"
                  />
                </div>

              </div>

              <div className="table-shell overflow-x-auto">

                <table className="w-full min-w-[800px]">

                  <thead className="table-head">
                    <tr>
                      <th className="table-cell text-left">
                        User
                      </th>

                      <th className="table-cell text-left">
                        Role
                      </th>

                      <th className="table-cell text-left">
                        Clubs
                      </th>

                      <th className="table-cell text-left">
                        Events
                      </th>

                      <th className="table-cell text-left">
                        Joined
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-12 text-center text-sm text-slate-500"
                        >
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user._id}
                          className="transition hover:bg-slate-50"
                        >

                          <td className="table-cell">
                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                                {user.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || 'U'}
                              </div>

                              <div>
                                <p className="font-bold text-black">
                                  {user.name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {user.email}
                                </p>
                              </div>

                            </div>
                          </td>

                          <td className="table-cell">
                            <span className="chip capitalize">
                              {user.role}
                            </span>
                          </td>

                          <td className="table-cell font-bold">
                            {user.joinedClubs?.length || 0}
                          </td>

                          <td className="table-cell font-bold">
                            {user.registeredEvents?.length || 0}
                          </td>

                          <td className="table-cell text-sm">
                            {user.createdAt
                              ? new Date(
                                  user.createdAt
                                ).toLocaleDateString()
                              : '—'}
                          </td>

                        </tr>
                      ))
                    )}

                  </tbody>
                </table>

              </div>
            </section>
          )}

          {/* ==================================================
              CLUBS
          ================================================== */}

          {activeTab === 'clubs' && (
            <section className="space-y-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Club Management
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create, review, and manage campus clubs.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">

                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search clubs..."
                      className="field w-full pl-10 sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowClubForm((value) => !value)
                    }
                    className="btn-primary"
                  >
                    {showClubForm ? (
                      <X size={17} />
                    ) : (
                      <Plus size={17} />
                    )}

                    {showClubForm
                      ? 'Close'
                      : 'Create club'}
                  </button>

                </div>
              </div>

              {/* Create Club */}

              {showClubForm && (
                <form
                  onSubmit={handleCreateClub}
                  className="app-card border border-slate-200"
                >
                  <div className="mb-5">
                    <h3 className="text-xl font-black text-black">
                      Create New Club
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Add a new club to the campus system.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <div>
                      <label className="field-label">
                        Club name *
                      </label>

                      <input
                        type="text"
                        required
                        value={newClub.clubName}
                        onChange={(e) =>
                          setNewClub({
                            ...newClub,
                            clubName: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Coding Club"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Description *
                      </label>

                      <input
                        type="text"
                        required
                        value={newClub.description}
                        onChange={(e) =>
                          setNewClub({
                            ...newClub,
                            description: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="A club for programming enthusiasts"
                      />
                    </div>

                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      <Plus size={17} />
                      Create club
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowClubForm(false)
                      }
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Clubs */}

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                {filteredClubs.length === 0 ? (
                  <div className="app-card col-span-full py-16 text-center">
                    <Briefcase
                      size={34}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-4 font-bold text-slate-500">
                      No clubs found.
                    </p>
                  </div>
                ) : (
                  filteredClubs.map((club) => (
                    <article
                      key={club._id}
                      className="app-card app-card-hover"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Briefcase size={20} />
                        </div>

                        <span className="chip">
                          {club.members?.length || 0} members
                        </span>

                      </div>

                      <h3 className="mt-5 text-xl font-black text-black">
                        {club.clubName}
                      </h3>

                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
                        {club.description ||
                          'No description available.'}
                      </p>

                      <div className="mt-5 space-y-2 text-sm">

                        <div className="flex items-center gap-2 text-slate-500">
                          <Users size={15} />
                          <span>
                            {club.members?.length || 0}{' '}
                            members
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <Shield size={15} />
                          <span>
                            Admin:{' '}
                            {club.admin?.name ||
                              'Not assigned'}
                          </span>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteClub(club._id)
                        }
                        className="btn-danger mt-6 w-full"
                      >
                        <Trash2 size={17} />
                        Delete club
                      </button>

                    </article>
                  ))
                )}

              </div>
            </section>
          )}

          {/* ==================================================
              EVENTS
          ================================================== */}

          {activeTab === 'events' && (
            <section className="space-y-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Event Management
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create and manage all campus events.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">

                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search events..."
                      className="field w-full pl-10 sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowEventForm((value) => !value)
                    }
                    className="btn-primary"
                  >
                    {showEventForm ? (
                      <X size={17} />
                    ) : (
                      <Plus size={17} />
                    )}

                    {showEventForm
                      ? 'Close'
                      : 'Create event'}
                  </button>

                </div>
              </div>

              {/* Create Event */}

              {showEventForm && (
                <form
                  onSubmit={handleCreateEvent}
                  className="app-card border border-slate-200"
                >
                  <div className="mb-5">
                    <h3 className="text-xl font-black text-black">
                      Create New Event
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Add an event to the campus calendar.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <div>
                      <label className="field-label">
                        Event title *
                      </label>

                      <input
                        type="text"
                        required
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            title: e.target.value,
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
                        required
                        value={newEvent.club}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            club: e.target.value,
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

                  <div className="mt-5">
                    <label className="field-label">
                      Description *
                    </label>

                    <textarea
                      required
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                      }
                      className="field min-h-28"
                      placeholder="Describe the event..."
                    />
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-4">

                    <div>
                      <label className="field-label">
                        Date & time *
                      </label>

                      <input
                        type="datetime-local"
                        required
                        value={newEvent.date}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            date: e.target.value,
                          })
                        }
                        className="field"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Location
                      </label>

                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            location: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Main Auditorium"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Capacity
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={newEvent.capacity}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            capacity: Number(
                              e.target.value
                            ),
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
                        type="text"
                        value={newEvent.category}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            category: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Technical"
                      />
                    </div>

                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      <Plus size={17} />
                      Create event
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowEventForm(false)
                      }
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Events */}

              <div className="table-shell overflow-x-auto">

                <table className="w-full min-w-[1000px]">

                  <thead className="table-head">
                    <tr>
                      <th className="table-cell text-left">
                        Event
                      </th>

                      <th className="table-cell text-left">
                        Date
                      </th>

                      <th className="table-cell text-left">
                        Location
                      </th>

                      <th className="table-cell text-left">
                        Registrations
                      </th>

                      <th className="table-cell text-left">
                        Status
                      </th>

                      <th className="table-cell text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-12 text-center text-sm text-slate-500"
                        >
                          No events found.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((event) => {
                        const status =
                          getEventStatus(event);

                        const registrations =
                          event.registeredStudents
                            ?.length || 0;

                        return (
                          <tr
                            key={event._id}
                            className="transition hover:bg-slate-50"
                          >

                            <td className="table-cell">
                              <div>
                                <p className="font-black text-black">
                                  {event.title}
                                </p>

                                <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                  {event.description}
                                </p>
                              </div>
                            </td>

                            <td className="table-cell">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar
                                  size={15}
                                  className="text-slate-400"
                                />
                                {formatDate(event.date)}
                              </div>
                            </td>

                            <td className="table-cell">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin
                                  size={15}
                                  className="text-slate-400"
                                />
                                {event.location ||
                                  'TBD'}
                              </div>
                            </td>

                            <td className="table-cell font-bold">
                              {registrations} /{' '}
                              {event.capacity}
                            </td>

                            <td className="table-cell">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusClasses(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="table-cell text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteEvent(
                                    event._id
                                  )
                                }
                                className="btn-danger px-3"
                                aria-label={`Delete ${event.title}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}

                  </tbody>
                </table>

              </div>
            </section>
          )}

          {/* ==================================================
              NOTIFICATIONS
          ================================================== */}

          {activeTab === 'notifications' && (
            <section className="space-y-6">

              <div>
                <h2 className="text-2xl font-black text-black">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Send announcements and updates to users.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[420px_1fr]">

                {/* Create notification */}

                <div className="app-card h-fit">

                  <div className="mb-6 flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Bell size={20} />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-black">
                        New Notification
                      </h3>

                      <p className="text-xs text-slate-500">
                        Broadcast an announcement
                      </p>
                    </div>

                  </div>

                  <form
                    onSubmit={handleCreateNotification}
                    className="space-y-5"
                  >

                    <div>
                      <label className="field-label">
                        Title
                      </label>

                      <input
                        type="text"
                        required
                        value={newNotification.title}
                        onChange={(e) =>
                          setNewNotification({
                            ...newNotification,
                            title: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Important announcement"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Type
                      </label>

                      <select
                        value={newNotification.type}
                        onChange={(e) =>
                          setNewNotification({
                            ...newNotification,
                            type: e.target.value,
                          })
                        }
                        className="field"
                      >
                        <option value="info">
                          Information
                        </option>

                        <option value="alert">
                          Alert
                        </option>

                        <option value="event">
                          Event
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Message
                      </label>

                      <textarea
                        required
                        value={newNotification.message}
                        onChange={(e) =>
                          setNewNotification({
                            ...newNotification,
                            message: e.target.value,
                          })
                        }
                        className="field min-h-32 resize-y"
                        placeholder="Write your notification..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full"
                    >
                      <Bell size={17} />
                      Send Notification
                    </button>

                  </form>
                </div>

                {/* Notification history */}

                <div>

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-black">
                        Notification History
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Previously sent notifications
                      </p>
                    </div>

                    <span className="chip">
                      {notifications.length} total
                    </span>
                  </div>

                  <div className="space-y-3">

                    {notifications.length === 0 ? (
                      <div className="app-card py-16 text-center">
                        <Bell
                          size={32}
                          className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 font-bold text-slate-500">
                          No notifications yet.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <article
                          key={notification._id}
                          className="app-card transition hover:shadow-md"
                        >

                          <div className="flex gap-4">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                              <Bell size={18} />
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-start justify-between gap-3">

                                <h4 className="font-black text-black">
                                  {notification.title}
                                </h4>

                                <span className="chip capitalize text-xs">
                                  {notification.type ||
                                    'info'}
                                </span>

                              </div>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {notification.message}
                              </p>

                              <p className="mt-3 text-xs font-semibold text-slate-400">
                                {notification.createdAt
                                  ? formatDate(
                                      notification.createdAt
                                    )
                                  : 'Recently'}
                              </p>

                            </div>

                          </div>

                        </article>
                      ))
                    )}

                  </div>
                </div>

              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminPanel;