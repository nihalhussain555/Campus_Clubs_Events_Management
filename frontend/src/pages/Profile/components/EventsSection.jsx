import React, { useEffect, useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  History,
  Loader2
} from 'lucide-react';

import { eventAPI } from '../services/api';

const EventsSection = ({ user }) => {
  const [activeTab, setActiveTab] = useState('upcoming');

  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // =====================================================
  // LOAD REGISTERED EVENTS
  // =====================================================

  const loadEvents = async () => {
    try {
      setLoading(true);

      const response =
        await eventAPI.getUpcomingEvents();

      const allEvents =
        response.data.events || [];

      const userId =
        user?.id || user?._id;

      const registered =
        allEvents.filter((event) =>
          (event.registeredStudents || []).some(
            (student) => {
              const studentId =
                typeof student === 'string'
                  ? student
                  : student._id || student.id;

              return studentId === userId;
            }
          )
        );

      setEvents(registered);
    } catch (error) {
      console.error(
        'Unable to load registered events:',
        error
      );

      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD EVENT HISTORY
  // =====================================================

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);

      const response =
        await eventAPI.getMyEventHistory();

      setHistory(
        response.data.history || []
      );
    } catch (error) {
      console.error(
        'Unable to load event history:',
        error
      );

      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadEvents();
      loadHistory();
    }
  }, [user]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return 'TBD';

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  };

  const formatTime = (date) => {
    if (!date) return 'TBD';

    return new Date(date).toLocaleTimeString(
      'en-US',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };

  // =====================================================
  // CANCEL / UNREGISTER
  // =====================================================

  const handleUnregister = async (eventId) => {
    if (
      !window.confirm(
        'Are you sure you want to unregister from this event?'
      )
    ) {
      return;
    }

    try {
      await eventAPI.unregisterFromEvent(
        eventId
      );

      await loadEvents();

    } catch (error) {
      console.error(
        'Unable to unregister:',
        error
      );
    }
  };

  // =====================================================
  // CERTIFICATE
  // =====================================================

  const handleCertificate = () => {
    window.location.href = '/certificates';
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading && activeTab === 'upcoming') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center justify-center">

        <Loader2
          className="animate-spin text-[#145f82]"
          size={24}
        />

        <span className="ml-3 text-sm font-semibold text-gray-500">
          Loading events...
        </span>

      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

      {/* =================================================
          TABS
      ================================================= */}

      <div className="border-b border-gray-100">

        <div className="flex px-6 pt-2 gap-6">

          <button
            className={`pb-4 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'upcoming'
                ? 'border-[#145f82] text-[#145f82]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() =>
              setActiveTab('upcoming')
            }
          >
            Registered Events
          </button>


          <button
            className={`pb-4 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'past'
                ? 'border-[#145f82] text-[#145f82]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() =>
              setActiveTab('past')
            }
          >
            Event History
          </button>

        </div>

      </div>


      <div className="p-6">

        {/* =================================================
            REGISTERED EVENTS
        ================================================= */}

        {activeTab === 'upcoming' && (

          events.length > 0 ? (

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {events.map((event) => (

                <div
                  key={event._id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >

                  <div className="h-24 bg-gradient-to-br from-[#145f82] to-slate-700 relative p-4 flex items-end">

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-md text-gray-800 shadow-sm">
                      Registered
                    </div>

                  </div>


                  <div className="p-5">

                    <h4 className="font-bold text-lg text-gray-900 mb-3">
                      {event.title}
                    </h4>


                    <div className="space-y-2 mb-6">

                      <div className="flex items-center text-sm text-gray-600 gap-2">

                        <Calendar className="w-4 h-4 text-[#145f82]" />

                        {formatDate(event.date)}

                      </div>


                      <div className="flex items-center text-sm text-gray-600 gap-2">

                        <Clock className="w-4 h-4 text-[#145f82]" />

                        {formatTime(event.date)}

                      </div>


                      <div className="flex items-center text-sm text-gray-600 gap-2">

                        <MapPin className="w-4 h-4 text-[#145f82]" />

                        {event.location || 'TBD'}

                      </div>

                    </div>


                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">

                      <span className="text-xs font-semibold text-gray-500">

                        {event.club?.clubName ||
                          'Campus Club'}

                      </span>


                      <button
                        type="button"
                        onClick={() =>
                          handleUnregister(
                            event._id
                          )
                        }
                        className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-semibold transition-colors"
                      >

                        <XCircle className="w-4 h-4" />

                        Cancel

                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="text-center py-10">

              <Calendar
                size={42}
                className="mx-auto mb-4 text-gray-300"
              />

              <h3 className="font-bold text-gray-700">
                No registered events
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Register for an event to see it here.
              </p>

            </div>

          )

        )}


        {/* =================================================
            EVENT HISTORY
        ================================================= */}

        {activeTab === 'past' && (

          historyLoading ? (

            <div className="flex justify-center py-10">

              <Loader2
                className="animate-spin text-[#145f82]"
                size={26}
              />

            </div>

          ) : history.length > 0 ? (

            <div className="space-y-4">

              {history.map((event) => (

                <div
                  key={event.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-4"
                >

                  <div className="flex items-center gap-4">

                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.attended
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >

                      {event.attended ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}

                    </div>


                    <div>

                      <h4 className="font-bold text-gray-800">
                        {event.name}
                      </h4>

                      <p className="text-sm text-gray-500">

                        {formatDate(event.date)}

                        {' • '}

                        {event.attended
                          ? 'Participated'
                          : 'Missed'}

                      </p>

                      {event.location && (
                        <p className="text-xs text-gray-400 mt-1">
                          {event.location}
                        </p>
                      )}

                    </div>

                  </div>


                  <div className="flex items-center gap-3">

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        event.attended
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {event.attended
                        ? 'Attended'
                        : 'Missed'}
                    </span>


                    {event.certificate && (

                      <button
                        type="button"
                        onClick={handleCertificate}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#eef8fc] text-[#145f82] hover:bg-[#dceff6] rounded-lg text-sm font-semibold transition-colors"
                      >

                        <Download className="w-4 h-4" />

                        Certificate

                      </button>

                    )}

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="text-center py-10">

              <History
                size={42}
                className="mx-auto mb-4 text-gray-300"
              />

              <h3 className="font-bold text-gray-700">
                No event history
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Your completed events will appear here.
              </p>

            </div>

          )

        )}

      </div>

    </div>
  );
};

export default EventsSection;