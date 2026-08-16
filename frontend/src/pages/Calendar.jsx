import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';
import { eventAPI } from '../services/api';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [notes, setNotes] = useState(() => {
    try {
        return JSON.parse(localStorage.getItem('calendarNotes') || '[]');
    } catch {
        return [];
    }
    });

const [selectedDate, setSelectedDate] = useState(null);
const [noteText, setNoteText] = useState('');

  const monthNames = [
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

  // =====================================================
  // FETCH EVENTS
  // =====================================================

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventAPI.getAllEvents();

        setEvents(response.data.events || []);
      } catch (error) {
        console.error(error);

        setToast({
          message: 'Unable to load calendar events',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);
useEffect(() => {
    localStorage.setItem('calendarNotes', JSON.stringify(notes));
    }, [notes]);
  // =====================================================
  // CALENDAR CALCULATIONS
  // =====================================================

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

  // =====================================================
  // EVENTS FOR CURRENT MONTH
  // =====================================================

  const currentMonthEvents = useMemo(() => {
    return events.filter((event) => {
      const date = new Date(event.date);

      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
  }, [events, currentMonth, currentYear]);

  // =====================================================
  // GET EVENTS FOR DAY
  // =====================================================

  const getEventsForDay = (day) => {
    return currentMonthEvents.filter((event) => {
      const date = new Date(event.date);

      return date.getDate() === day;
    });
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  // =====================================================
  // EVENT STATUS
  // =====================================================

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);

    if (event.status === 'cancelled') {
      return 'Cancelled';
    }

    if (event.status === 'ongoing') {
      return 'Ongoing';
    }

    if (event.status === 'completed') {
      return 'Completed';
    }

    if (eventDate < now) {
      return 'Completed';
    }

    return 'Upcoming';
  };

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
                  View all campus events, workshops and activities
                  in one place.
                </p>
              </div>

              <button
                onClick={goToToday}
                className="btn-secondary flex items-center gap-2"
              >
                <CalendarDays size={18} />
                Today
              </button>

            </div>
          </div>

          {/* ================================================= */}
          {/* CALENDAR */}
          {/* ================================================= */}

          <div className="app-card">

            {/* Calendar Header */}

            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">

              <button
                onClick={previousMonth}
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
                >
                  {monthNames.map((month, index) => (
                    <option
                      key={month}
                      value={index}
                    >
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
                >
                  {Array.from(
                    { length: 16 },
                    (_, index) => 2020 + index
                  ).map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ))}
                </select>

              </div>

              <button
                onClick={nextMonth}
                className="btn-secondary flex items-center justify-center"
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>

            </div>

            {/* ================================================= */}
            {/* MONTH TITLE */}
            {/* ================================================= */}

            <div className="text-center mb-6">

              <h2 className="text-2xl sm:text-3xl font-black text-black">
                {monthNames[currentMonth]} {currentYear}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {currentMonthEvents.length}{' '}
                {currentMonthEvents.length === 1
                  ? 'event'
                  : 'events'}{' '}
                this month
              </p>

            </div>

            {/* ================================================= */}
            {/* WEEK DAYS */}
            {/* ================================================= */}

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
                  className="text-center text-xs sm:text-sm font-bold text-slate-500 py-2"
                >
                  {day}
                </div>
              ))}

            </div>

            {/* ================================================= */}
            {/* DAYS */}
            {/* ================================================= */}

            <div className="grid grid-cols-7 gap-2">

              {/* Empty days */}

              {blanksArray.map((blank) => (
                <div
                  key={`blank-${blank}`}
                  className="min-h-[100px] sm:min-h-[130px] rounded-xl bg-slate-50 border border-slate-100"
                />
              ))}

              {/* Actual days */}

              {daysArray.map((day) => {

                const dayNotes = notes.filter(
                    note =>
                        note.day === day &&
                        note.month === currentMonth &&
                        note.year === currentYear
                    );
                const dayEvents = getEventsForDay(day);

                return (
                  <div
                    key={`day-${day}`}
                    className={`min-h-[100px] sm:min-h-[130px] p-2 rounded-xl border transition-all ${
                      isToday(day)
                        ? 'border-[#145f82] ring-2 ring-[#145f82]/20 bg-[#f4fbfe]'
                        : 'border-slate-200 bg-white hover:border-[#145f82]/40'
                    }`}
                  >

                    {/* Day number */}

                    <div
                      className={`text-sm font-bold mb-2 ${
                        isToday(day)
                          ? 'text-[#145f82]'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}

                      {isToday(day) && (
                        <span className="ml-1 text-[9px] uppercase font-black">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Events */}

                    <div className="flex flex-col gap-1">

                        {dayNotes.map((note) => (
                            <div
                                key={note.id}
                                className="text-[10px] bg-yellow-100 text-yellow-800 rounded px-1 py-1"
                            >
                                📝 {note.text}

                                <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    setNotes((prev) =>
                                    prev.filter((n) => n.id !== note.id)
                                    );
                                }}
                                className="ml-1 text-red-500 font-bold"
                                >
                                ×
                                </button>
                            </div>
                            ))}
                      {dayEvents.map((event) => {

                        const status = getEventStatus(event);

                        return (
                          <button
                            key={event._id}
                            type="button"
                            onClick={() =>
                              setSelectedEvent(event)
                            }
                            className={`w-full text-left text-[10px] sm:text-xs p-1.5 rounded-lg truncate font-semibold transition-all hover:scale-[1.02] ${
                              status === 'Cancelled'
                                ? 'bg-gray-100 text-gray-500'
                                : status === 'Completed'
                                ? 'bg-slate-100 text-slate-600'
                                : status === 'Ongoing'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-[#eef8fc] text-[#145f82]'
                            }`}
                            title={event.title}
                          >
                            {event.title}
                          </button>
                        );

                      })}

                    </div>

                  </div>
                );

              })}

            </div>

          </div>

          {/* ================================================= */}
          {/* MONTH EVENT LIST */}
          {/* ================================================= */}

          <div className="mt-8">

            <div className="mb-5">
              <span className="eyebrow">Schedule</span>

              <h2 className="text-2xl sm:text-3xl font-black text-black">
                Events this month
              </h2>
            </div>

            {currentMonthEvents.length > 0 ? (

              <div className="grid gap-4 lg:grid-cols-2">

                {currentMonthEvents
                  .sort(
                    (a, b) =>
                      new Date(a.date) -
                      new Date(b.date)
                  )
                  .map((event) => {

                    const status = getEventStatus(event);

                    return (
                      <button
                        key={event._id}
                        type="button"
                        onClick={() =>
                          setSelectedEvent(event)
                        }
                        className="app-card app-card-hover text-left"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <h3 className="text-xl font-black text-black">
                              {event.title}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {event.club?.clubName ||
                                'Campus Event'}
                            </p>

                          </div>

                          <span
                            className={`chip ${
                              status === 'Cancelled'
                                ? 'bg-gray-100 text-gray-600'
                                : status === 'Completed'
                                ? 'bg-slate-100 text-slate-600'
                                : status === 'Ongoing'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {status}
                          </span>

                        </div>

                        <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">

                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={16}
                              className="text-[#145f82]"
                            />

                            {new Date(
                              event.date
                            ).toLocaleDateString(
                              'en-US',
                              {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              }
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock
                              size={16}
                              className="text-[#145f82]"
                            />

                            {formatTime(event.date)}
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin
                              size={16}
                              className="text-[#145f82]"
                            />

                            {event.location ||
                              'To be announced'}
                          </div>

                        </div>

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
                  No events scheduled this month.
                </p>

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

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

            <div className="p-6">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <span className="eyebrow">
                    Event details
                  </span>

                  <h2 className="text-2xl font-black text-black mt-1">
                    {selectedEvent.title}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedEvent(null)
                  }
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>

              </div>

              <p className="mt-5 text-slate-600 leading-7">
                {selectedEvent.description}
              </p>

              <div className="mt-6 space-y-4">

                <div className="flex items-center gap-3">

                  <CalendarDays
                    size={20}
                    className="text-[#145f82]"
                  />

                  <div>
                    <p className="text-xs text-slate-400 font-bold">
                      DATE
                    </p>

                    <p className="font-semibold">
                      {new Date(
                        selectedEvent.date
                      ).toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        }
                      )}
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <Clock
                    size={20}
                    className="text-[#145f82]"
                  />

                  <div>
                    <p className="text-xs text-slate-400 font-bold">
                      TIME
                    </p>

                    <p className="font-semibold">
                      {formatTime(selectedEvent.date)}
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <MapPin
                    size={20}
                    className="text-[#145f82]"
                  />

                  <div>
                    <p className="text-xs text-slate-400 font-bold">
                      LOCATION
                    </p>

                    <p className="font-semibold">
                      {selectedEvent.location ||
                        'To be announced'}
                    </p>
                  </div>

                </div>

              </div>

              <div className="mt-6 flex justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedEvent(null)
                  }
                  className="btn-secondary"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {selectedDate && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
    <div className="bg-white rounded-xl p-6 w-[400px] max-w-[90%]">

      <h2 className="text-xl font-bold mb-4">
        Add Note for {selectedDate}
      </h2>

      <textarea
        className="field w-full"
        rows="5"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write your notes..."
        autoFocus
      />

      <div className="flex gap-3 mt-5">

        <button
          type="button"
          className="btn-primary"
          onClick={saveCalendarNote}
        >
          Save Note
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setNoteText('');
            setSelectedDate(null);
          }}
        >
          Cancel
        </button>

      </div>

    </div>
  </div>
)}
    </div>
  );
};



export default Calendar;