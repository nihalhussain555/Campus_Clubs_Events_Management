import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  School,
  User,
  Users,
  XCircle,
} from 'lucide-react';

import Navbar from '../../components/Navbar';
import LoadingScreen from '../../components/LoadingScreen';
import Toast from '../../components/Toast';

import { authAPI, eventAPI } from '../../services/api';
import EditProfileModal from './components/EditProfileModal';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [events, setEvents] = useState([]);

  const [user, setUser] = useState({
    name: '',
    studentId: '',
    email: '',
    personalEmail: '',
    department: '',
    year: '',
    semester: '',
    course: '',
    section: '',
    role: 'student',
    bio: '',
    gender: '',
    dob: '',
    phone: '',
    address: '',
    profilePic: '',
    joinedClubs: [],
    registeredEvents: [],
  });

  // ============================================================
  // FETCH USER PROFILE
  // ============================================================

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();

      const dbUser = response.data.user || {};

      setUser((prev) => ({
        ...prev,
        ...dbUser,
        joinedClubs: dbUser.joinedClubs || [],
        registeredEvents: dbUser.registeredEvents || [],
      }));

      // Keep localStorage updated
      const storedUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          ...dbUser,
        })
      );
    } catch (error) {
      console.error('Profile loading error:', error);

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load profile information',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH EVENTS
  // ============================================================

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);

      const response = await eventAPI.getAllEvents();

      const fetchedEvents = response.data.events || [];

      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Events loading error:', error);

      setToast({
        message: 'Unable to load event information',
        type: 'error',
      });
    } finally {
      setEventsLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchUserProfile();
    fetchEvents();
  }, []);

  // ============================================================
  // USER ID
  // ============================================================

  const userId = useMemo(() => {
    return user?._id || user?.id || '';
  }, [user]);

  // ============================================================
  // REGISTERED EVENTS
  // ============================================================

  const registeredEvents = useMemo(() => {
    if (!userId) return [];

    return events.filter((event) => {
      const students = event.registeredStudents || [];

      return students.some((student) => {
        if (typeof student === 'string') {
          return student === userId;
        }

        return (
          student?._id === userId ||
          student?.id === userId
        );
      });
    });
  }, [events, userId]);

  // ============================================================
  // EVENT STATUS
  // ============================================================

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);

    const status = event.status?.toLowerCase();

    if (status === 'cancelled') {
      return 'Cancelled';
    }

    if (
      status === 'completed' ||
      status === 'finished' ||
      eventDate < now
    ) {
      return 'Finished';
    }

    if (status === 'ongoing') {
      return 'Ongoing';
    }

    return 'Upcoming';
  };

  // ============================================================
  // UPCOMING EVENTS
  // ============================================================

  const upcomingEvents = useMemo(() => {
    return registeredEvents
      .filter((event) => {
        const status = getEventStatus(event);

        return (
          status === 'Upcoming' ||
          status === 'Ongoing'
        );
      })
      .sort(
        (a, b) =>
          new Date(a.date) - new Date(b.date)
      );
  }, [registeredEvents]);

  // ============================================================
  // EVENT HISTORY
  // ============================================================

  const eventHistory = useMemo(() => {
    return registeredEvents
      .filter((event) => {
        const status = getEventStatus(event);

        return (
          status === 'Finished' ||
          status === 'Cancelled'
        );
      })
      .sort(
        (a, b) =>
          new Date(b.date) - new Date(a.date)
      );
  }, [registeredEvents]);

  // ============================================================
  // COMPLETED EVENTS
  // ============================================================

  const completedEvents = useMemo(() => {
    return registeredEvents.filter(
      (event) =>
        getEventStatus(event) === 'Finished'
    );
  }, [registeredEvents]);

  // ============================================================
  // CLUB COUNT
  // ============================================================

  const clubsJoined = user?.joinedClubs?.length || 0;

  // ============================================================
  // ACHIEVEMENTS
  // ============================================================

  const achievements = completedEvents.length > 0 ? 1 : 0;

  // ============================================================
  // PROFILE SAVE
  // ============================================================

  const handleProfileSave = (updatedUser) => {
    setUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));

    setIsEditing(false);

    setToast({
      message: 'Profile updated successfully!',
      type: 'success',
    });

    const stored = JSON.parse(
      localStorage.getItem('user') || '{}'
    );

    localStorage.setItem(
      'user',
      JSON.stringify({
        ...stored,
        ...updatedUser,
      })
    );
  };

  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDate = (date) => {
    if (!date) return 'Date not available';

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  const formatDateTime = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  };

  // ============================================================
  // ROLE DISPLAY
  // ============================================================

  const getRoleName = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'Admin';

      case 'club_leader':
        return 'Club Leader';

      case 'club_member':
        return 'Club Member';

      default:
        return 'Student';
    }
  };

  // ============================================================
  // PROFILE IMAGE
  // ============================================================

  const profileImage =
    user?.profilePic ||
    user?.profileImage ||
    '';

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <LoadingScreen message="Loading profile..." />
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="app-page min-h-screen bg-slate-50">

      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <EditProfileModal
          user={user}
          onClose={() => setIsEditing(false)}
          onSave={handleProfileSave}
        />
      )}

      <main className="page-section pt-8 pb-16">

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

          {/* ==================================================
              PROFILE HEADER
          ================================================== */}

          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Header Banner */}
            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#101a30] via-[#17233a] to-[#26364f]">

              {/* Decorative circles */}
              <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/10" />

              <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-slate-300/10" />

              <div className="absolute inset-0 opacity-20">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      'radial-gradient(#ffffff 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                  }}
                />
              </div>

              {/* Campus Clubs Brand */}
              <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-4">

                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">

                  <GraduationCap
                    size={34}
                    strokeWidth={1.8}
                    className="text-white"
                  />

                </div>

                <div className="hidden sm:block">

                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Campus Clubs
                  </h2>

                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                    Student & Club Management System
                  </p>

                </div>

              </div>

            </div>

            {/* Profile Details */}
            <div className="relative px-6 pb-6 sm:px-8">

              <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">

                  {/* Profile Image */}
                  <div className="relative">

                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-8 border-white bg-slate-100 shadow-lg">

                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={user.name || 'Profile'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display =
                              'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200">

                          <User
                            size={48}
                            className="text-indigo-500"
                          />

                        </div>
                      )}

                    </div>

                  </div>

                  {/* Name / ID */}
                  <div className="pb-1">

                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Student Profile
                    </p>

                    <div className="flex flex-wrap items-center gap-3">

                      <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        {user.name || 'Student'}
                      </h1>

                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                        {getRoleName(user.role)}
                      </span>

                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">

                      <span>
                        ID:{' '}
                        {user.studentId || 'Not provided'}
                      </span>

                      <span>•</span>

                      <span>
                        {user.department ||
                          'Department not provided'}
                      </span>

                    </div>

                  </div>

                </div>

                {/* Edit Profile */}
                <button
                  type="button"
                  onClick={() =>
                    setIsEditing(true)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>

              </div>

            </div>

          </section>

          {/* ==================================================
              STATISTICS
          ================================================== */}

          <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">

            <StatCard
              icon={<CalendarDays size={18} />}
              value={registeredEvents.length}
              label="Registered Events"
              iconClass="bg-blue-50 text-blue-600"
            />

            <StatCard
              icon={<CheckCircle2 size={18} />}
              value={completedEvents.length}
              label="Events Completed"
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              icon={<Users size={18} />}
              value={clubsJoined}
              label="Clubs Joined"
              iconClass="bg-violet-50 text-violet-600"
            />

            <StatCard
              icon={<Award size={18} />}
              value={achievements}
              label="Achievements"
              iconClass="bg-amber-50 text-amber-600"
            />

          </section>

          {/* ==================================================
              MAIN GRID
          ================================================== */}

          <div className="mt-6 grid gap-6 lg:grid-cols-3">

            {/* ==================================================
                LEFT COLUMN
            ================================================== */}

            <div className="space-y-6">

              {/* PERSONAL INFORMATION */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <SectionHeading
                  icon={<User size={17} />}
                  title="Personal Information"
                  subtitle="Your personal details"
                />

                <div className="mt-5 space-y-4">

                  <InfoRow
                    icon={<Mail size={15} />}
                    label="Email"
                    value={
                      user.email || 'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<Mail size={15} />}
                    label="Personal Email"
                    value={
                      user.personalEmail ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<Phone size={15} />}
                    label="Phone"
                    value={
                      user.phone || 'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<MapPin size={15} />}
                    label="Address"
                    value={
                      user.address ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<Calendar size={15} />}
                    label="Date of Birth"
                    value={
                      user.dob
                        ? formatDate(user.dob)
                        : 'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<User size={15} />}
                    label="Gender"
                    value={
                      user.gender ||
                      'Not provided'
                    }
                  />

                </div>

              </section>

              {/* ACADEMIC INFORMATION */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <SectionHeading
                  icon={<GraduationCap size={17} />}
                  title="Academic Information"
                  subtitle="Your academic details"
                />

                <div className="mt-5 space-y-4">

                  <InfoRow
                    icon={<School size={15} />}
                    label="Student ID"
                    value={
                      user.studentId ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<School size={15} />}
                    label="Department"
                    value={
                      user.department ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<GraduationCap size={15} />}
                    label="Course"
                    value={
                      user.course ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<Calendar size={15} />}
                    label="Year"
                    value={
                      user.year ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<Calendar size={15} />}
                    label="Semester"
                    value={
                      user.semester ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    icon={<Users size={15} />}
                    label="Section"
                    value={
                      user.section ||
                      'Not provided'
                    }
                  />

                </div>

              </section>

            </div>

            {/* ==================================================
                RIGHT COLUMN
            ================================================== */}

            <div className="space-y-6 lg:col-span-2">

              {/* ==================================================
                  UPCOMING EVENTS
              ================================================== */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <SectionHeading
                  icon={<Calendar size={17} />}
                  title="Upcoming Events"
                  subtitle="Events you are registered for"
                  count={upcomingEvents.length}
                />

                <div className="mt-5">

                  {eventsLoading ? (

                    <div className="flex items-center justify-center py-12">

                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />

                    </div>

                  ) : upcomingEvents.length === 0 ? (

                    <EmptyState
                      icon={<Calendar size={25} />}
                      title="No upcoming events"
                      text="You don't have any upcoming registered events."
                    />

                  ) : (

                    <div className="space-y-3">

                      {upcomingEvents.map(
                        (event) => (

                          <EventCard
                            key={event._id}
                            event={event}
                            status={getEventStatus(
                              event
                            )}
                            formatDate={
                              formatDateTime
                            }
                          />

                        )
                      )}

                    </div>

                  )}

                </div>

              </section>

              {/* ==================================================
                  EVENT HISTORY
              ================================================== */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <SectionHeading
                  icon={<Clock3 size={17} />}
                  title="Event History"
                  subtitle="Your completed and cancelled events"
                  count={eventHistory.length}
                />

                <div className="mt-5">

                  {eventsLoading ? (

                    <div className="flex items-center justify-center py-10">

                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />

                    </div>

                  ) : eventHistory.length === 0 ? (

                    <EmptyState
                      icon={<Clock3 size={25} />}
                      title="No event history"
                      text="Your completed events will appear here."
                    />

                  ) : (

                    <div className="space-y-3">

                      {eventHistory.map(
                        (event) => (

                          <EventCard
                            key={event._id}
                            event={event}
                            status={getEventStatus(
                              event
                            )}
                            formatDate={
                              formatDateTime
                            }
                            history
                          />

                        )
                      )}

                    </div>

                  )}

                </div>

              </section>

              {/* ==================================================
                  RECENT ACTIVITY
              ================================================== */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <SectionHeading
                  icon={<Activity size={17} />}
                  title="Recent Activity"
                  subtitle="Your latest campus activity"
                />

                <div className="mt-5">

                  {registeredEvents.length === 0 ? (

                    <EmptyState
                      icon={<Activity size={25} />}
                      title="No recent activity"
                      text="Register for an event to start building your activity history."
                    />

                  ) : (

                    <div className="space-y-4">

                      {registeredEvents
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.date) -
                            new Date(a.date)
                        )
                        .slice(0, 5)
                        .map((event) => (

                          <div
                            key={event._id}
                            className="flex items-start gap-3"
                          >

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">

                              <Calendar
                                size={16}
                              />

                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="text-sm font-bold text-slate-800">

                                Registered for{' '}

                                <span className="text-indigo-600">
                                  {event.title}
                                </span>

                              </p>

                              <p className="mt-1 text-xs text-slate-500">

                                {event.club?.clubName ||
                                  'Campus Club'}

                                {' • '}

                                {formatDateTime(
                                  event.date
                                )}

                              </p>

                            </div>

                          </div>

                        ))}

                    </div>

                  )}

                </div>

              </section>

            </div>

          </div>

          {/* ==================================================
              BIO
          ================================================== */}

          {user.bio && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">

                  <User size={17} />

                </div>

                <div>

                  <h2 className="font-black text-slate-900">
                    About Me
                  </h2>

                  <p className="text-xs text-slate-400">
                    Profile introduction
                  </p>

                </div>

              </div>

              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                {user.bio}
              </p>

            </section>
          )}

        </div>

      </main>

    </div>
  );
};

/* ================================================================
   STAT CARD
================================================================ */

const StatCard = ({
  icon,
  value,
  label,
  iconClass,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-center gap-4">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>

          <p className="text-2xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {label}
          </p>

        </div>

      </div>

    </div>
  );
};

/* ================================================================
   SECTION HEADING
================================================================ */

const SectionHeading = ({
  icon,
  title,
  subtitle,
  count,
}) => {
  return (
    <div className="flex items-start justify-between">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </div>

        <div>

          <h2 className="text-sm font-black text-slate-900">
            {title}
          </h2>

          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            {subtitle}
          </p>

        </div>

      </div>

      {typeof count === 'number' && (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          {count}
        </span>
      )}

    </div>
  );
};

/* ================================================================
   INFORMATION ROW
================================================================ */

const InfoRow = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-start gap-3">

      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-semibold text-slate-700">
          {value}
        </p>

      </div>

    </div>
  );
};

/* ================================================================
   EMPTY STATE
================================================================ */

const EmptyState = ({
  icon,
  title,
  text,
}) => {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-10 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-700">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {text}
      </p>

    </div>
  );
};

/* ================================================================
   EVENT CARD
================================================================ */

const EventCard = ({
  event,
  status,
  formatDate,
  history = false,
}) => {
  const isCancelled =
    status === 'Cancelled';

  const isFinished =
    status === 'Finished';

  const isOngoing =
    status === 'Ongoing';

  let statusClass =
    'border-emerald-200 bg-emerald-50 text-emerald-600';

  let StatusIcon = CheckCircle2;

  if (isCancelled) {
    statusClass =
      'border-red-200 bg-red-50 text-red-600';

    StatusIcon = XCircle;
  } else if (isFinished) {
    statusClass =
      'border-slate-200 bg-slate-100 text-slate-600';

    StatusIcon = CheckCircle2;
  } else if (isOngoing) {
    statusClass =
      'border-amber-200 bg-amber-50 text-amber-600';

    StatusIcon = Clock3;
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-slate-50/50">

      <div className="flex gap-3">

        {/* Event Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">

          <CalendarDays size={17} />

        </div>

        {/* Event Content */}
        <div className="min-w-0 flex-1">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <h3 className="truncate text-sm font-black text-slate-800">
                {event.title}
              </h3>

              <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                {event.description ||
                  'Campus event'}
              </p>

            </div>

            <span
              className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass}`}
            >

              <StatusIcon size={11} />

              {status}

            </span>

          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-400">

            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(event.date)}
            </span>

            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {event.location}
              </span>
            )}

            {event.club?.clubName && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                {event.club.clubName}
              </span>
            )}

          </div>

          {!history &&
            event.capacity && (
              <div className="mt-3">

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">

                  <span>
                    Registered
                  </span>

                  <span>
                    {event.registeredStudents
                      ?.length || 0}{' '}
                    / {event.capacity}
                  </span>

                </div>

                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((event.registeredStudents
                          ?.length || 0) /
                          event.capacity) *
                          100
                      )}%`,
                    }}
                  />

                </div>

              </div>
            )}

        </div>

      </div>

    </div>
  );
};

export default ProfilePage;