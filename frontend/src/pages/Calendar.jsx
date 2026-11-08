import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Plus,
  StickyNote,
  Trash2,
  Users,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import AddToCalendar from '../components/AddToCalendar';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';
import { eventAPI } from '../services/api';
import { statusLabel as getEventStatus } from '../utils/eventStatus';
import {
  addCalendarNote,
  deleteCalendarNote,
  removeEventFromCalendar,
  useMyCalendar
} from '../hooks/useMyCalendar';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MAX_NOTE_LENGTH = 240;

// Notes used to live in this browser's localStorage, which meant they vanished
// on any other device. They are handed to the server once, then the key is
// dropped so the migration cannot run twice.
const LEGACY_NOTES_KEY = 'calendarNotes';
const NOTES_MIGRATED_KEY = 'calendarNotesMigrated';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const calendar = useMyCalendar();

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [noteDraft, setNoteDraft] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // =====================================================
  // FETCH CAMPUS EVENTS
  // =====================================================

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventAPI.getAllEvents();

        setEvents(response.data.events || []);
      } catch (error) {
        setToast({
          message:
            error.response?.data?.message ||
            'Unable to load calendar events',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // =====================================================
  // MOVE BROWSER-ONLY NOTES ONTO THE ACCOUNT
  // =====================================================

  useEffect(() => {
    if (!calendar.loaded || localStorage.getItem(NOTES_MIGRATED_KEY)) return;

    const migrate = async () => {
      let stored = [];

      try {
        stored = JSON.parse(localStorage.getItem(LEGACY_NOTES_KEY) || '[]');
      } catch {
        stored = [];
      }

      const candidates = Array.isArray(stored) ? stored.slice(0, 50) : [];

      let moved = 0;

      for (const note of candidates) {
        if (
          !note?.text ||
          !Number.isInteger(note.day) ||
          !Number.isInteger(note.month) ||
          !Number.isInteger(note.year)
        ) {
          continue;
        }

        try {
          await addCalendarNote(note);
          moved += 1;
        } catch {
          // A note the server refuses is left behind rather than blocking the
          // rest of the migration.
        }
      }

      localStorage.setItem(NOTES_MIGRATED_KEY, '1');
      localStorage.removeItem(LEGACY_NOTES_KEY);

      if (candidates.length) {
        setToast({
          message: moved
            ? `${moved} saved note${moved === 1 ? '' : 's'} moved to your calendar`
            : 'Your stored notes were not valid calendar entries',
          type: moved ? 'success' : 'error'
        });
      }
    };

    migrate();
  }, [calendar.loaded]);

  // =====================================================
  // CALENDAR LOAD ERRORS
  // =====================================================

  useEffect(() => {
    if (calendar.error) {
      setToast({ message: calendar.error, type: 'error' });
    }
  }, [calendar.error]);

  // =====================================================
  // GRID GEOMETRY
  // =====================================================

  const { daysInMonth, leadingBlanks } = useMemo(() => {
    return {
      daysInMonth: new Date(currentYear, currentMonth + 1, 0).getDate(),
      leadingBlanks: new Date(currentYear, currentMonth, 1).getDay()
    };
  }, [currentMonth, currentYear]);

  const days = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  const activeDay = Math.min(selectedDay, daysInMonth);

  // =====================================================
  // EVENTS AND NOTES PER DAY
  // =====================================================

  const eventsByDay = useMemo(() => {
    const map = new Map();

    const source = showOnlyMine ? calendar.events : events;

    source.forEach((event) => {
      const date = new Date(event.date);

      if (
        Number.isNaN(date.getTime()) ||
        date.getMonth() !== currentMonth ||
        date.getFullYear() !== currentYear
      ) {
        return;
      }

      const day = date.getDate();

      map.set(day, [...(map.get(day) || []), event]);
    });

    map.forEach((list) =>
      list.sort((a, b) => new Date(a.date) - new Date(b.date))
    );

    return map;
  }, [events, calendar.events, showOnlyMine, currentMonth, currentYear]);

  const notesByDay = useMemo(() => {
    const map = new Map();

    calendar.notes.forEach((note) => {
      if (note.month !== currentMonth || note.year !== currentYear) return;

      map.set(note.day, [...(map.get(note.day) || []), note]);
    });

    return map;
  }, [calendar.notes, currentMonth, currentYear]);

  const monthEvents = useMemo(
    () =>
      [...eventsByDay.values()]
        .flat()
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [eventsByDay]
  );

  const monthNotes = useMemo(
    () => calendar.notes.filter((n) => n.month === currentMonth && n.year === currentYear),
    [calendar.notes, currentMonth, currentYear]
  );

  const savedUpcoming = useMemo(
    () =>
      calendar.events
        .filter((event) => {
          const status = getEventStatus(event);

          return status === 'Upcoming' || status === 'Ongoing';
        })
        .slice(0, 6),
    [calendar.events]
  );

  const dayEvents = eventsByDay.get(activeDay) || [];
  const dayNotes = notesByDay.get(activeDay) || [];

  // =====================================================
  // NAVIGATION
  // =====================================================

  const shiftMonth = (step) => {
    const next = new Date(currentYear, currentMonth + step, 1);

    setCurrentMonth(next.getMonth());
    setCurrentYear(next.getFullYear());
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  // =====================================================
  // FORMATTERS
  // =====================================================

  const formatTime = (value) =>
    new Date(value).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const formatFullDate = (value) =>
    new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

  const dayLabel = (day) =>
    new Date(currentYear, currentMonth, day).toLocaleDateString(
      'en-US',
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    );

  const isToday = (day) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  // =====================================================
  // CALENDAR ACTIONS
  // =====================================================

  const removeSaved = async (event) => {
    setBusyId(event._id);

    try {
      const result = await removeEventFromCalendar(event._id);

      setToast({ message: result.message, type: 'success' });
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Could not remove the event from your calendar',
        type: 'error'
      });
    } finally {
      setBusyId(null);
    }
  };

  const openNoteDraft = (day) =>
    setNoteDraft({ day, month: currentMonth, year: currentYear, text: '' });

  const saveNote = async () => {
    const text = noteDraft.text.trim();

    if (!text) {
      setToast({ message: 'Write something before saving the note', type: 'error' });
      return;
    }

    setSavingNote(true);

    try {
      const result = await addCalendarNote({ ...noteDraft, text });

      setSelectedDay(noteDraft.day);
      setNoteDraft(null);
      setToast({ message: result.message, type: 'success' });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Could not save the note',
        type: 'error'
      });
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (note) => {
    setBusyId(note.id);

    try {
      await deleteCalendarNote(note.id);

      setToast({ message: 'Note deleted', type: 'success' });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Could not delete the note',
        type: 'error'
      });
    } finally {
      setBusyId(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return <LoadingScreen message="Loading calendar..." />;
  }

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

      <main className="page-section pt-8">
        <div className="page-container">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="mb-8">
            <span className="eyebrow">Campus calendar</span>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <h1 className="display-title text-4xl sm:text-5xl">
                  Event Calendar
                </h1>

                <p className="section-copy mt-4">
                  Browse the month, save what matters to your in-app calendar,
                  and leave yourself notes on any day.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={() => openNoteDraft(activeDay)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Note
                </button>

                <button
                  onClick={goToToday}
                  className="btn-primary flex items-center gap-2"
                >
                  <CalendarDays size={18} />
                  Today
                </button>

              </div>

            </div>
          </div>

          {/* ================================================= */}
          {/* SUMMARY */}
          {/* ================================================= */}

          <div className="mb-6 grid gap-4 sm:grid-cols-3">

            <div className="metric-card">
              <p className="text-3xl font-black text-black">
                {monthEvents.length}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {showOnlyMine ? 'Saved' : 'Campus'} events in{' '}
                {MONTH_NAMES[currentMonth]}
              </p>
            </div>

            <div className="metric-card">
              <p className="text-3xl font-black text-black">
                {calendar.events.length}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Events in my calendar
              </p>
            </div>

            <div className="metric-card">
              <p className="text-3xl font-black text-black">
                {calendar.notes.length}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Notes saved to my account
              </p>
            </div>

          </div>

          {/* ================================================= */}
          {/* GRID + SIDE PANEL */}
          {/* ================================================= */}

          <div className="grid gap-6 lg:grid-cols-3">

            {/* =============================================== */}
            {/* MONTH GRID */}
            {/* =============================================== */}

            <div className="app-card lg:col-span-2">

              <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">

                <button
                  onClick={() => shiftMonth(-1)}
                  className="btn-secondary flex items-center justify-center"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3">

                  <select
                    value={currentMonth}
                    onChange={(e) =>
                      setCurrentMonth(Number(e.target.value))
                    }
                    className="field"
                    aria-label="Month"
                  >
                    {MONTH_NAMES.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <select
                    value={currentYear}
                    onChange={(e) =>
                      setCurrentYear(Number(e.target.value))
                    }
                    className="field"
                    aria-label="Year"
                  >
                    {Array.from(
                      { length: 16 },
                      (_, index) => 2020 + index
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                </div>

                <button
                  onClick={() => shiftMonth(1)}
                  className="btn-secondary flex items-center justify-center"
                  aria-label="Next month"
                >
                  <ChevronRight size={20} />
                </button>

              </div>

              <div className="text-center mb-5">

                <h2 className="text-2xl sm:text-3xl font-black text-black">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">

                  <button
                    type="button"
                    aria-pressed={!showOnlyMine}
                    onClick={() => setShowOnlyMine(false)}
                    className={
                      showOnlyMine
                        ? 'filter-pill'
                        : 'filter-pill filter-pill-active'
                    }
                  >
                    Campus events
                  </button>

                  <button
                    type="button"
                    aria-pressed={showOnlyMine}
                    onClick={() => setShowOnlyMine(true)}
                    className={
                      showOnlyMine
                        ? 'filter-pill filter-pill-active'
                        : 'filter-pill'
                    }
                  >
                    Only my calendar
                  </button>

                </div>

              </div>

              {/* Weekday headings */}

              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs sm:text-sm font-bold text-slate-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}

              <div className="grid grid-cols-7 gap-2">

                {Array.from({ length: leadingBlanks }, (_, index) => (
                  <div
                    key={`blank-${index}`}
                    className="min-h-[104px] sm:min-h-[132px] rounded-xl border border-slate-100 bg-slate-50"
                    aria-hidden="true"
                  />
                ))}

                {days.map((day) => {
                  const cellEvents = eventsByDay.get(day) || [];
                  const cellNotes = notesByDay.get(day) || [];
                  const selected = day === activeDay;

                  return (
                    <div
                      key={`day-${day}`}
                      className={`min-h-[104px] sm:min-h-[132px] p-1.5 sm:p-2 rounded-xl border transition-colors ${
                        selected
                          ? 'border-[#bcddeb] bg-[#eef8fc]'
                          : 'border-slate-200 bg-white hover:border-[#bcddeb]'
                      }`}
                    >

                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        aria-label={`Open the agenda for ${dayLabel(day)}`}
                        aria-pressed={selected}
                        className={`mb-1.5 flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-left text-sm font-bold transition-colors ${
                          isToday(day)
                            ? 'bg-[#2d7a9b] text-white'
                            : selected
                              ? 'bg-[#145f82] text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {day}

                        {isToday(day) && (
                          <span className="ml-auto text-[9px] font-black uppercase tracking-wide">
                            Today
                          </span>
                        )}
                      </button>

                      <div className="flex flex-col gap-1">

                        {cellNotes.map((note) => (
                          <div
                            key={note.id}
                            className="chip justify-between gap-1 px-1.5 py-0.5 text-[10px] font-semibold"
                            title={note.text}
                          >
                            <span className="flex min-w-0 items-center gap-1">
                              <StickyNote size={10} className="shrink-0" />
                              <span className="truncate">{note.text}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => removeNote(note)}
                              aria-label={`Delete the note "${note.text}"`}
                              className="shrink-0 text-slate-400 hover:text-red-600"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}

                        {cellEvents.slice(0, 3).map((event) => {
                          const status = getEventStatus(event);
                          const saved = calendar.isSaved(event._id);

                          return (
                            <button
                              key={event._id}
                              type="button"
                              onClick={() => setSelectedEvent(event)}
                              title={`${event.title} - ${formatTime(event.date)}`}
                              className={`w-full truncate rounded-lg p-1.5 text-left text-[10px] sm:text-xs font-semibold transition-colors ${
                                status === 'Cancelled'
                                  ? 'bg-gray-100 text-gray-500 line-through'
                                  : status === 'Completed'
                                    ? 'bg-slate-100 text-slate-600'
                                    : saved
                                      ? 'bg-[#d7edf7] text-[#145f82]'
                                      : 'bg-[#eef8fc] text-[#145f82]'
                              }`}
                            >
                              {event.title}
                            </button>
                          );
                        })}

                        {cellEvents.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className="text-[10px] font-bold text-slate-500 hover:underline"
                          >
                            +{cellEvents.length - 3} more
                          </button>
                        )}

                      </div>

                    </div>
                  );
                })}

              </div>

              {/* Legend */}

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[11px] font-bold text-slate-500">

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-[#eef8fc]" />
                  Event
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-[#d7edf7]" />
                  In my calendar
                </span>

                <span className="flex items-center gap-2">
                  <StickyNote size={12} />
                  My note
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-slate-100" />
                  Past
                </span>

              </div>

            </div>

            {/* =============================================== */}
            {/* SIDE PANEL */}
            {/* =============================================== */}

            <div className="space-y-6">

              {/* MY CALENDAR */}

              <section className="app-card">

                <div className="flex items-start gap-3">

                  <div className="icon-tile">
                    <CalendarCheck size={20} />
                  </div>

                  <div>
                    <h2 className="section-title text-xl">My calendar</h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Saved events, soonest first
                    </p>
                  </div>

                </div>

                {calendar.loading ? (

                  <p className="mt-5 text-sm text-slate-500">
                    Loading your saved events...
                  </p>

                ) : savedUpcoming.length === 0 ? (

                  <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">

                    <CalendarDays
                      size={26}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="text-sm font-bold text-slate-600">
                      Nothing saved yet
                    </p>

                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
                      Open an event and choose Add to my calendar. It stays here
                      on every device you sign in from.
                    </p>

                  </div>

                ) : (

                  <ul className="mt-5 space-y-3">

                    {savedUpcoming.map((event) => (
                      <li
                        key={event._id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEvent(event);

                              setCurrentMonth(
                                new Date(event.date).getMonth()
                              );
                              setCurrentYear(
                                new Date(event.date).getFullYear()
                              );
                              setSelectedDay(
                                new Date(event.date).getDate()
                              );
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-black text-slate-800">
                              {event.title}
                            </p>

                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatTime(event.date)}
                              </span>

                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {event.location || 'TBD'}
                              </span>
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeSaved(event)}
                            disabled={busyId === event._id}
                            aria-label={`Remove ${event.title} from my calendar`}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>

                        <p className="mt-2 text-[11px] text-slate-500">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                          {' - '}
                          {event.club?.clubName || 'Campus event'}
                        </p>

                      </li>
                    ))}

                  </ul>

                )}

                <p className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">

                  <BellRing size={14} className="mt-0.5 shrink-0 text-[#2d7a9b]" />

                  {calendar.remindersEnabled === false
                    ? 'Event reminders are switched off in Account settings, so saved events stay quiet here.'
                    : 'A reminder arrives shortly before each saved or registered event starts.'}

                </p>

              </section>

              {/* DAY AGENDA */}

              <section className="app-card">

                <div className="flex items-start justify-between gap-3">

                  <div className="flex items-start gap-3">

                    <div className="icon-tile">
                      <Info size={20} />
                    </div>

                    <div>
                      <h2 className="section-title text-xl">Agenda</h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {dayLabel(activeDay)}
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() => openNoteDraft(activeDay)}
                    className="btn-soft flex items-center gap-1.5 px-3 py-2 text-xs"
                  >
                    <Plus size={14} />
                    Note
                  </button>

                </div>

                <div className="mt-5 space-y-3">

                  {dayEvents.length === 0 && dayNotes.length === 0 && (

                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                      A clear day. Add a note to remember something for it.
                    </p>

                  )}

                  {dayEvents.map((event) => {
                    const status = getEventStatus(event);
                    const saved = calendar.isSaved(event._id);

                    return (
                      <button
                        key={event._id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-[#bcddeb]"
                      >

                        <div className="flex items-start justify-between gap-2">

                          <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">
                            {event.title}
                          </p>

                          <span className={`chip shrink-0 ${
                            status === 'Cancelled'
                              ? 'bg-gray-100 text-gray-500'
                              : status === 'Completed'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-[#eef8fc] text-[#145f82]'
                          }`}>
                            {status}
                          </span>

                        </div>

                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">

                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(event.date)}
                            {event.endDate && (
                              <> &ndash; {formatTime(event.endDate)}</>
                            )}
                          </span>

                          {event.club?.clubName && (
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {event.club.clubName}
                            </span>
                          )}

                          {saved && (
                            <span className="flex items-center gap-1 text-[#145f82]">
                              <CalendarCheck size={12} />
                              Saved
                            </span>
                          )}

                        </p>

                      </button>
                    );
                  })}

                  {dayNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"
                    >

                      <div className="flex min-w-0 items-start gap-2">

                        <StickyNote
                          size={14}
                          className="mt-0.5 shrink-0 text-[#2d7a9b]"
                        />

                        <p className="break-words text-xs font-semibold leading-5 text-slate-600">
                          {note.text}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() => removeNote(note)}
                        disabled={busyId === note.id}
                        aria-label="Delete this note"
                        className="shrink-0 text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  ))}

                </div>

              </section>

            </div>

          </div>

          {/* ================================================= */}
          {/* MONTH SCHEDULE */}
          {/* ================================================= */}

          <div className="mt-10">

            <div className="mb-5">
              <span className="eyebrow">Schedule</span>

              <h2 className="text-2xl sm:text-3xl font-black text-black">
                {showOnlyMine
                  ? `My saved events in ${MONTH_NAMES[currentMonth]}`
                  : `Events in ${MONTH_NAMES[currentMonth]}`}
              </h2>
            </div>

            {monthEvents.length > 0 ? (

              <div className="grid gap-4 lg:grid-cols-2">

                {monthEvents.map((event) => {
                  const status = getEventStatus(event);
                  const saved = calendar.isSaved(event._id);

                  return (
                    <button
                      key={event._id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="app-card app-card-hover text-left"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <h3 className="truncate text-xl font-black text-black">
                            {event.title}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {event.club?.clubName || 'Campus Event'}
                          </p>

                        </div>

                        <span
                          className={`chip shrink-0 ${
                            status === 'Cancelled'
                              ? 'bg-gray-100 text-gray-500'
                              : status === 'Completed'
                                ? 'bg-slate-100 text-slate-600'
                                : status === 'Ongoing'
                                  ? 'bg-[#d7edf7] text-[#145f82]'
                                  : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {status}
                        </span>

                      </div>

                      <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">

                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-[#145f82]" />

                          {formatFullDate(event.date)}
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-[#145f82]" />

                          {formatTime(event.date)}
                          {event.endDate && (
                            <span className="text-slate-500">
                              {' - '}{formatTime(event.endDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-[#145f82]" />

                          {event.location || 'To be announced'}
                        </div>

                      </div>

                      {saved && (
                        <p className="mt-4 flex items-center gap-2 text-xs font-bold text-[#145f82]">
                          <CalendarCheck size={14} />
                          In my calendar
                        </p>
                      )}

                    </button>
                  );
                })}

              </div>

            ) : (

              <div className="app-card text-center py-10">

                <CalendarDays
                  size={40}
                  className="mx-auto text-slate-300 mb-3"
                />

                <p className="font-bold text-slate-500">
                  {showOnlyMine
                    ? `Nothing saved to your calendar in ${MONTH_NAMES[currentMonth]}.`
                    : 'No events scheduled this month.'}
                </p>

                {showOnlyMine && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyMine(false)}
                    className="btn-secondary mx-auto mt-5"
                  >
                    Browse campus events
                  </button>
                )}

              </div>

            )}

          </div>

        </div>
      </main>

      {/* ===================================================== */}
      {/* EVENT DETAILS MODAL */}
      {/* ===================================================== */}

      {selectedEvent && (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

          <div className="modal-card w-full max-w-lg">

            <div className="p-6">

              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                  <span className="eyebrow">Event details</span>

                  <h2 className="text-2xl font-black text-black mt-1">
                    {selectedEvent.title}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="shrink-0 p-2 rounded-lg hover:bg-slate-100"
                  aria-label="Close event details"
                >
                  <X size={20} />
                </button>

              </div>

              {selectedEvent.description && (
                <p className="mt-5 text-slate-600 leading-7">
                  {selectedEvent.description}
                </p>
              )}

              <div className="mt-6 space-y-4">

                <div className="flex items-center gap-3">

                  <CalendarDays size={20} className="text-[#145f82]" />

                  <div>
                    <p className="text-xs text-slate-400 font-bold">
                      DATE
                    </p>

                    <p className="font-semibold text-slate-700">
                      {formatFullDate(selectedEvent.date)}
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <Clock size={20} className="text-[#145f82]" />

                  <div>
                    <p className="text-xs text-slate-400 font-bold">
                      TIME
                    </p>

                    <p className="font-semibold text-slate-700">
                      {formatTime(selectedEvent.date)}
                      {selectedEvent.endDate &&
                        ` - ${formatTime(selectedEvent.endDate)}`}
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <MapPin size={20} className="text-[#145f82]" />

                  <div>
                    <p className="text-xs text-slate-400 font-bold">
                      LOCATION
                    </p>

                    <p className="font-semibold text-slate-700">
                      {selectedEvent.location || 'To be announced'}
                    </p>
                  </div>

                </div>

              </div>

              <div className="mt-6">
                <AddToCalendar
                  event={selectedEvent}
                  onNotify={setToast}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">

                <p className="text-xs text-slate-500">
                  Saving puts this event on your calendar page.
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="btn-secondary"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ===================================================== */}
      {/* NOTE MODAL */}
      {/* ===================================================== */}

      {noteDraft && (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

          <div className="modal-card w-full max-w-md">

            <div className="flex items-start justify-between gap-4">

              <div>
                <span className="eyebrow">Day note</span>

                <h2 className="text-xl font-black text-black mt-1">
                  {dayLabel(noteDraft.day)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setNoteDraft(null)}
                className="shrink-0 p-2 rounded-lg hover:bg-slate-100"
                aria-label="Cancel note"
              >
                <X size={20} />
              </button>

            </div>

            <textarea
              className="field mt-5"
              rows="5"
              maxLength={MAX_NOTE_LENGTH}
              value={noteDraft.text}
              onChange={(e) =>
                setNoteDraft((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder="Remind yourself about something on this day..."
              autoFocus
            />

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">

              <span>
                Notes live on your account, not this browser.
              </span>

              <span>
                {noteDraft.text.trim().length}/{MAX_NOTE_LENGTH}
              </span>

            </div>

            <div className="mt-5 flex justify-end gap-3">

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setNoteDraft(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={savingNote || !noteDraft.text.trim()}
                onClick={saveNote}
              >
                {savingNote ? 'Saving...' : 'Save note'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Calendar;
