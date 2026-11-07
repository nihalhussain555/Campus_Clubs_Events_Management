import React, { useEffect, useState } from 'react';
import {
  Ban,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Mail,
  Medal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import SkeletonGrid from '../components/Skeleton';
import EventCheckInDesk from '../components/EventCheckInDesk';

import { clubAPI, eventAPI, gamificationAPI } from '../services/api';
import { statusLabel as statusOf } from '../utils/eventStatus';
import {
  ACTIVITY_OPTIONS,
  activityLabel,
  activityXp
} from '../utils/activityTypes';
import { toInputValue, withInstantTimes } from '../utils/eventTime';

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  endDate: '',
  location: '',
  category: 'General',
  capacity: 100,
  club: '',
  activityType: 'event'
};

const LeaderDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?.id || user?._id;

  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingEvent, setEditingEvent] = useState(null);

  const [rosterEventId, setRosterEventId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const [editingClubId, setEditingClubId] = useState(null);
  const [clubForm, setClubForm] = useState({
    clubName: '',
    description: '',
    category: ''
  });
  const [clubSaving, setClubSaving] = useState(false);

  // Club leaderboard standings, winners selection and credit submission
  const [standings, setStandings] = useState({});
  const [winnerIds, setWinnerIds] = useState([]);
  const [crediting, setCrediting] = useState(false);

  const load = async () => {
    try {
      const clubsResponse = await clubAPI.getAllClubs();
      const allClubs = clubsResponse.data?.clubs || [];

      const mine = allClubs.filter((club) => {
        const adminId = club?.admin?._id || club?.admin;
        return adminId && userId && String(adminId) === String(userId);
      });

      setClubs(mine);

      const perClub = await Promise.all(
        mine.map((club) =>
          eventAPI
            .getEventsByClub(club._id)
            .then((res) => res.data?.events || [])
            .catch(() => [])
        )
      );

      setEvents(
        perClub
          .flat()
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      );

      // A club that has not scored yet still has a standing (rank null, zero
      // XP), so a failed read here is a real fault worth staying silent about
      // rather than blocking the whole dashboard.
      const standingEntries = await Promise.all(
        mine.map((club) =>
          gamificationAPI
            .getClubStanding(club._id, { period: 'overall' })
            .then((res) => [club._id, res.data])
            .catch(() => null)
        )
      );

      setStandings(Object.fromEntries(standingEntries.filter(Boolean)));
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || 'Unable to load your clubs',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const clubNameOf = (event) =>
    event?.club?.clubName ||
    clubs.find((club) => club._id === event?.club)?.clubName ||
    'Unassigned';

  const metrics = [
    { label: 'Clubs I lead', value: clubs.length, icon: Users },
    { label: 'Events hosted', value: events.length, icon: Calendar },
    {
      label: 'Upcoming',
      value: events.filter((e) => statusOf(e) === 'Upcoming').length,
      icon: ClipboardList
    },
    {
      label: 'Members',
      value: clubs.reduce((t, c) => t + (c.members?.length || 0), 0),
      icon: CheckCircle2
    }
  ];

  const openCreateForm = () => {
    setForm({ ...EMPTY_FORM, club: clubs.length === 1 ? clubs[0]._id : '' });
    setEditingEvent(null);
    setFormMode('create');
  };

  const openEditForm = (event) => {
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: toInputValue(event.date),
      endDate: toInputValue(event.endDate),
      location: event.location || '',
      category: event.category || 'General',
      capacity: event.capacity ?? 100,
      activityType: event.activityType || 'event',
      club: event?.club?._id || event?.club || ''
    });
    setEditingEvent(event);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.date ||
      !form.endDate ||
      !form.club
    ) {
      setToast({
        message: 'Title, description, both dates and a club are required',
        type: 'error'
      });
      return;
    }

    if (new Date(form.endDate) <= new Date(form.date)) {
      setToast({ message: 'The end time must be after the start time', type: 'error' });
      return;
    }

    setSaving(true);

    try {
      if (formMode === 'edit' && editingEvent) {
        await eventAPI.updateEvent(editingEvent._id, withInstantTimes(form));
        setToast({ message: 'Event updated', type: 'success' });
      } else {
        await eventAPI.createEvent(withInstantTimes(form));
        setToast({ message: 'Event created', type: 'success' });
      }

      closeForm();
      await load();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || 'Unable to save the event',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const runAction = (action) => {
    setPendingAction(null);
    action?.run();
  };

  const requestDeleteEvent = (event) => {
    setPendingAction({
      title: `Delete ${event.title}?`,
      message:
        'This removes the event, its registrations and the certificates issued for it. This cannot be undone.',
      confirmLabel: 'Delete event',
      run: async () => {
        try {
          await eventAPI.deleteEvent(event._id);
          setToast({ message: 'Event deleted', type: 'success' });
          await load();
        } catch (error) {
          setToast({
            message: error.response?.data?.message || 'Unable to delete the event',
            type: 'error'
          });
        }
      }
    });
  };

  const requestCancelEvent = (event) => {
    const cancelling = statusOf(event) !== 'Cancelled';

    setPendingAction({
      title: cancelling
        ? `Cancel ${event.title}?`
        : `Reopen ${event.title}?`,
      message: cancelling
        ? 'Everyone on campus is told the event is off. Registrations are kept, so you can reopen it if plans change.'
        : 'The event goes back on the schedule using its own dates, and students are told it is running again.',
      confirmLabel: cancelling ? 'Cancel event' : 'Reopen event',
      tone: cancelling ? 'danger' : 'primary',
      run: async () => {
        try {
          await eventAPI.updateEvent(event._id, {
            status: cancelling ? 'cancelled' : 'upcoming'
          });

          setToast({
            message: cancelling
              ? 'Event cancelled and announced'
              : 'Event reopened',
            type: 'success'
          });

          await load();
        } catch (error) {
          setToast({
            message:
              error.response?.data?.message || 'Unable to update the event',
            type: 'error'
          });
        }
      }
    });
  };

  const markPresent = async (eventId, studentId) => {
    try {
      const response = await eventAPI.markAttendance(eventId, studentId);
      setToast({
        message: response.data?.message || 'Attendance recorded',
        type: 'success'
      });
      await load();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || error.message ||
          'Unable to record attendance',
        type: 'error'
      });
    }
  };

  const removePresent = async (eventId, studentId) => {
    try {
      await eventAPI.removeAttendance(eventId, studentId);
      setToast({ message: 'Attendance removed', type: 'success' });
      await load();
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Unable to remove attendance',
        type: 'error'
      });
    }
  };

  // --------------------------------------------------
  // GAMIFICATION
  // --------------------------------------------------

  const toggleWinner = (studentId) => {
    setWinnerIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const submitWinners = async (event) => {
    try {
      setCrediting(true);

      const response = await gamificationAPI.recordWinners(
        event._id,
        winnerIds
      );

      setToast({
        message: response.data?.message || 'Results recorded',
        type: 'success'
      });

      setWinnerIds([]);
      await load();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || 'Unable to record the results',
        type: 'error'
      });
    } finally {
      setCrediting(false);
    }
  };

  const requestOrganizerCredit = (event) => {
    setPendingAction({
      title: `Credit the organisers of ${event.title}?`,
      message:
        'You and anyone you named as a co-organiser earn the organising rate ' +
        'for this event. The credit is booked once per event, so pressing ' +
        'this twice changes nothing.',
      confirmLabel: 'Credit organisers',
      tone: 'primary',
      run: async () => {
        try {
          setCrediting(true);

          const response = await gamificationAPI.creditOrganizers(
            event._id,
            []
          );

          setToast({
            message: response.data?.message || 'Organisers credited',
            type: 'success'
          });

          await load();
        } catch (error) {
          setToast({
            message:
              error.response?.data?.message ||
              'Unable to credit the organisers',
            type: 'error'
          });
        } finally {
          setCrediting(false);
        }
      }
    });
  };

  const requestTransfer = (club, member) => {
    setPendingAction({
      title: `Make ${member.name} leader of ${club.clubName}?`,
      message:
        'You lose editing rights over this club as soon as the transfer is confirmed. You stay a member.',
      confirmLabel: 'Transfer leadership',
      tone: 'primary',
      run: async () => {
        try {
          await clubAPI.transferLeadership(club._id, member._id);
          setToast({ message: 'Leadership transferred', type: 'success' });
          await load();
        } catch (error) {
          setToast({
            message:
              error.response?.data?.message || 'Unable to transfer leadership',
            type: 'error'
          });
        }
      }
    });
  };

  const openClubEdit = (club) => {
    setEditingClubId(club._id);
    setClubForm({
      clubName: club.clubName || '',
      description: club.description || '',
      category: club.category || ''
    });
  };

  const closeClubEdit = () => setEditingClubId(null);

  const handleClubSubmit = async (e) => {
    e.preventDefault();

    if (!clubForm.clubName.trim() || !clubForm.description.trim()) {
      setToast({
        message: 'Club name and description are required',
        type: 'error'
      });
      return;
    }

    setClubSaving(true);

    try {
      await clubAPI.updateClub(editingClubId, {
        ...clubForm,
        category: clubForm.category.trim() || 'General'
      });
      setToast({ message: 'Club updated', type: 'success' });
      closeClubEdit();
      await load();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || 'Unable to update the club',
        type: 'error'
      });
    } finally {
      setClubSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="app-page">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <main className="page-section pt-8">
          <div className="page-container">

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">Club leader</span>
                <h1 className="display-title text-4xl sm:text-5xl">My clubs</h1>
                <p className="section-copy mt-4">
                  Run your clubs, publish events, check students in and issue
                  certificates from one place.
                </p>
              </div>

              <button
                type="button"
                onClick={formMode ? closeForm : openCreateForm}
                className="btn-primary"
              >
                {formMode ? (
                  <>
                    <X size={18} /> Close form
                  </>
                ) : (
                  <>
                    <Plus size={18} /> New event
                  </>
                )}
              </button>
            </div>

            {loading ? (
              <SkeletonGrid count={3} className="grid gap-5" />
            ) : clubs.length === 0 ? (
              <EmptyState
                icon={Users}
                title="You do not lead a club yet"
                message="A college administrator assigns club leaders. Once you lead a club, its events, roster and check-in desk appear here."
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {metrics.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="metric-card">
                      <div className="mb-3 flex items-center gap-2 text-slate-500">
                        <Icon size={17} className="text-[#145f82]" />
                        <span className="text-sm font-bold">{label}</span>
                      </div>
                      <p className="text-3xl font-black text-[#073c57]">{value}</p>
                    </div>
                  ))}
                </div>

                <section className="mt-10 space-y-5">
                  <h2 className="text-2xl font-black text-[#073c57]">
                    Clubs you manage
                  </h2>

                  {clubs.map((club) => {
                    const standing = standings[club._id];

                    return (
                    <article key={club._id} className="app-card">
                      <h3 className="text-xl font-black text-black">
                        {club.clubName}
                      </h3>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        {club.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="chip">{club.category || 'General'}</span>
                        <span className="chip">
                          {club.members?.length || 0} members
                        </span>
                      </div>

                      {editingClubId === club._id ? (
                        <form
                          onSubmit={handleClubSubmit}
                          className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="field-label">Club name *</label>
                              <input
                                value={clubForm.clubName}
                                onChange={(e) =>
                                  setClubForm({
                                    ...clubForm,
                                    clubName: e.target.value
                                  })
                                }
                                className="field"
                              />
                            </div>

                            <div>
                              <label className="field-label">Category</label>
                              <input
                                value={clubForm.category}
                                onChange={(e) =>
                                  setClubForm({
                                    ...clubForm,
                                    category: e.target.value
                                  })
                                }
                                className="field"
                                placeholder="Technical"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="field-label">Description *</label>
                            <textarea
                              value={clubForm.description}
                              onChange={(e) =>
                                setClubForm({
                                  ...clubForm,
                                  description: e.target.value
                                })
                              }
                              className="field min-h-24"
                            />
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              type="submit"
                              className="btn-primary"
                              disabled={clubSaving}
                            >
                              {clubSaving ? 'Saving...' : 'Save club'}
                            </button>

                            <button
                              type="button"
                              onClick={closeClubEdit}
                              className="btn-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-5">
                          <button
                            type="button"
                            onClick={() => openClubEdit(club)}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            <Pencil size={15} />
                            Edit details
                          </button>
                        </div>
                      )}

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            <Trophy size={14} className="text-[#145f82]" />
                            Club leaderboard standing
                          </p>

                          <span className="chip">
                            {standing?.rank
                              ? `#${standing.rank} of ${standing.rankedClubs}`
                              : `Unranked of ${standing?.rankedClubs || 0}`}
                          </span>

                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            { label: 'Club score', value: standing?.totalXp ?? 0 },
                            {
                              label: 'Verified participants',
                              value: standing?.participation ?? 0
                            },
                            {
                              label: 'Events hosted',
                              value: standing?.eventsOrganized ?? 0
                            },
                            {
                              label: 'Sessions credited',
                              value: standing?.attendanceSessions ?? 0
                            }
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                            >
                              <p className="text-lg font-black text-[#073c57]">
                                {item.value}
                              </p>

                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                {item.label}
                              </p>
                            </div>
                          ))}
                        </div>

                        {standing?.topContributors?.length ? (
                          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                            <Medal size={14} className="text-[#145f82]" />
                            {`Top contributor: ${standing.topContributors[0].name} with ${standing.topContributors[0].totalXp} XP`}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">
                            No XP has been credited through this club yet.
                          </p>
                        )}

                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Hand the club to another member
                        </p>

                        <select
                          className="field"
                          defaultValue=""
                          aria-label={`New leader for ${club.clubName}`}
                          onChange={(e) => {
                            const member = (club.members || []).find(
                              (item) => item._id === e.target.value
                            );

                            if (member) {
                              requestTransfer(club, member);
                            }

                            e.target.value = '';
                          }}
                        >
                          <option value="">Select a member</option>

                          {(club.members || [])
                            .filter((m) => String(m._id) !== String(userId))
                            .map((member) => (
                              <option key={member._id} value={member._id}>
                                {member.name}
                                {member.email ? ` (${member.email})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </article>
                    );
                  })}
                </section>

                {formMode && (
                  <form onSubmit={handleSubmit} className="app-card mt-10 space-y-5">
                    <h2 className="text-2xl font-black text-black">
                      {formMode === 'edit' ? 'Edit event' : 'Create event'}
                    </h2>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="field-label">Event title *</label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="field"
                          placeholder="Annual Tech Workshop"
                        />
                      </div>

                      <div>
                        <label className="field-label">Club *</label>
                        <select
                          value={form.club}
                          onChange={(e) => setForm({ ...form, club: e.target.value })}
                          className="field"
                        >
                          <option value="">Select a club</option>
                          {clubs.map((club) => (
                            <option key={club._id} value={club._id}>
                              {club.clubName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Description *</label>
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        className="field min-h-28"
                        placeholder="What happens, who should come, what to bring"
                      />
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <div>
                        <label className="field-label">Start *</label>
                        <input
                          type="datetime-local"
                          value={form.date}
                          onChange={(e) => setForm({ ...form, date: e.target.value })}
                          className="field"
                        />
                      </div>

                      <div>
                        <label className="field-label">End *</label>
                        <input
                          type="datetime-local"
                          value={form.endDate}
                          min={form.date}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          className="field"
                        />
                      </div>

                      <div>
                        <label className="field-label">Capacity</label>
                        <input
                          type="number"
                          min="1"
                          value={form.capacity}
                          onChange={(e) =>
                            setForm({ ...form, capacity: Number(e.target.value) })
                          }
                          className="field"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="field-label">Location</label>
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          className="field"
                          placeholder="Main Auditorium"
                        />
                      </div>

                      <div>
                        <label className="field-label">Category</label>
                        <input
                          type="text"
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="field"
                          placeholder="Technical"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Activity type</label>

                      <select
                        value={form.activityType}
                        onChange={(e) =>
                          setForm({ ...form, activityType: e.target.value })
                        }
                        className="field"
                      >
                        {ACTIVITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {`${option.label} — ${option.xp} XP per verified attendee`}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs text-slate-500">
                        The activity type decides what a verified check-in is
                        worth. Competition winners are credited on top of it,
                        once per event.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                      <button
                        type="button"
                        onClick={closeForm}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary flex-1"
                      >
                        {saving
                          ? 'Saving...'
                          : formMode === 'edit'
                            ? 'Save changes'
                            : 'Create event'}
                      </button>
                    </div>
                  </form>
                )}

                <section className="mt-10 space-y-5">
                  <h2 className="text-2xl font-black text-[#073c57]">Events</h2>

                  {events.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No events yet"
                      message="Create your first event and students can register for it from the Events page."
                      actionLabel="New event"
                      onAction={openCreateForm}
                    />
                  ) : (
                    events.map((event) => {
                      const status = statusOf(event);
                      const registered = event.registeredStudents || [];
                      const presentIds = (event.participants || []).map((p) =>
                        String(p?._id || p)
                      );

                      return (
                        <article key={event._id} className="app-card">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-xl font-black text-black">
                                {event.title}
                              </h3>

                              <p className="mt-1 text-sm font-bold text-slate-500">
                                {clubNameOf(event)}
                              </p>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {new Date(event.date).toLocaleString('en-GB', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                                {' to '}
                                {new Date(event.endDate).toLocaleTimeString('en-GB', {
                                  timeStyle: 'short'
                                })}
                                {' · '}
                                {event.location || 'TBD'}
                                {' · '}
                                {activityLabel(event.activityType)}
                              </p>
                            </div>

                            <span className="chip">
                              {status} · {registered.length}/
                              {event.capacity ?? 100}
                            </span>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(event)}
                              className="btn-secondary"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRosterEventId(
                                  rosterEventId === event._id
                                    ? null
                                    : event._id
                                );
                                setWinnerIds([]);
                              }}
                              className="btn-soft"
                            >
                              <Users size={17} />
                              Roster
                            </button>

                            <button
                              type="button"
                              onClick={() => requestOrganizerCredit(event)}
                              disabled={crediting}
                              className="btn-soft"
                            >
                              <Trophy size={17} />
                              Credit organisers
                            </button>

                            <button
                              type="button"
                              onClick={() => requestCancelEvent(event)}
                              className="btn-soft"
                            >
                              <Ban size={17} />
                              {status === 'Cancelled' ? 'Reopen' : 'Cancel'}
                            </button>

                            <button
                              type="button"
                              onClick={() => requestDeleteEvent(event)}
                              className="btn-danger px-3"
                              aria-label={`Delete ${event.title}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>

                          {status === 'Ongoing' && (
                            <EventCheckInDesk
                              event={event}
                              onNotify={setToast}
                              onVerified={load}
                            />
                          )}

                          {rosterEventId === event._id && (
                            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                              <p className="table-head bg-slate-50 px-5 py-3 text-sm">
                                {`Registered students · ${activityLabel(event.activityType)} · ${activityXp(event.activityType)} XP per verified attendee`}
                              </p>

                              {registered.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-slate-500">
                                  Nobody has registered yet.
                                </p>
                              ) : (
                                <>
                                  {registered.map((student) => {
                                    const studentId = String(
                                      student?._id || student
                                    );

                                    const present =
                                      presentIds.includes(studentId);

                                    const isWinner =
                                      winnerIds.includes(studentId);

                                    return (
                                      <div
                                        key={studentId}
                                        className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div>
                                          <p className="text-sm font-bold text-black">
                                            {student?.name || 'Student'}
                                          </p>

                                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                            <Mail size={13} />
                                            {student?.email}
                                          </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleWinner(studentId)
                                            }
                                            className={
                                              isWinner
                                                ? 'btn-primary px-3 py-1.5 text-xs'
                                                : 'btn-secondary px-3 py-1.5 text-xs'
                                            }
                                          >
                                            <Sparkles size={14} />
                                            {isWinner
                                              ? 'Winner selected'
                                              : 'Mark winner'}
                                          </button>

                                          {present ? (
                                            <div className="flex items-center gap-3">
                                              <span className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                                                <CheckCircle2 size={17} />
                                                Present
                                              </span>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removePresent(
                                                    event._id,
                                                    studentId
                                                  )
                                                }
                                                className="btn-secondary px-3 py-1.5 text-xs"
                                              >
                                                Undo
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                markPresent(
                                                  event._id,
                                                  studentId
                                                )
                                              }
                                              className="btn-success px-4 py-2 text-xs"
                                            >
                                              Mark present
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                      <Trophy size={16} className="text-[#145f82]" />
                                      {winnerIds.length
                                        ? `${winnerIds.length} winner(s) selected · 50 XP each`
                                        : 'Select the winners to credit them with 50 XP'}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={!winnerIds.length || crediting}
                                        onClick={() => submitWinners(event)}
                                        className="btn-primary px-3 py-1.5 text-xs"
                                      >
                                        <Trophy size={14} />
                                        Record results
                                      </button>

                                      {!!winnerIds.length && (
                                        <button
                                          type="button"
                                          onClick={() => setWinnerIds([])}
                                          className="btn-secondary px-3 py-1.5 text-xs"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.title}
        message={pendingAction?.message}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone || 'danger'}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => runAction(pendingAction)}
      />
    </>
  );
};

export default LeaderDashboard;
