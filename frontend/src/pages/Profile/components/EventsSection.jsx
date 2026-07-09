import React, { useState } from 'react';
import { Calendar, MapPin, Clock, QrCode, XCircle, CheckCircle, Download } from 'lucide-react';

const EventsSection = ({ user }) => {
  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingEvents = user?.registeredEvents?.length > 0 
    ? user.registeredEvents.map(event => ({
        id: event._id || event.id,
        name: event.title || event.name,
        date: event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
        time: event.time || 'TBD',
        venue: event.venue || 'TBD',
        status: event.status || 'Registered',
        banner: 'bg-gradient-to-br from-indigo-500 to-purple-600'
      }))
    : [
        {
          id: 1,
          name: 'No registered events',
          date: '---',
          time: '---',
          venue: '---',
          status: 'N/A',
          banner: 'bg-gray-200'
        }
      ];

  const pastEvents = [
    { id: 101, name: 'Web Dev Bootcamp', date: 'June 5, 2026', certificate: true },
    { id: 102, name: 'Robotics Seminar', date: 'May 12, 2026', certificate: false },
    { id: 103, name: 'Cybersecurity 101', date: 'April 20, 2026', certificate: true },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100">
        <div className="flex px-6 pt-2 gap-6">
          <button 
            className={`pb-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'upcoming' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Registered Events
          </button>
          <button 
            className={`pb-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'past' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('past')}
          >
            Event History
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'upcoming' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingEvents.map(event => (
              <div key={event.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className={`h-24 ${event.banner} relative p-4 flex items-end`}>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-md text-gray-800 shadow-sm">
                    {event.status}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-lg text-gray-900 mb-3">{event.name}</h4>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" /> {event.date}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" /> {event.time}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" /> {event.venue}
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                    <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">
                      <QrCode className="w-4 h-4" /> Get Pass
                    </button>
                    <button className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-semibold transition-colors">
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'past' && (
          <div className="space-y-4">
            {pastEvents.map(event => (
              <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{event.name}</h4>
                    <p className="text-sm text-gray-500">{event.date} • Participated</p>
                  </div>
                </div>
                {event.certificate && (
                  <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors">
                    <Download className="w-4 h-4" /> Certificate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsSection;
