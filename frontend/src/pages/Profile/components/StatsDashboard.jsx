import React from 'react';
import { Users, Calendar } from 'lucide-react';

const StatsDashboard = ({ user }) => {
  const stats = [
    { label: 'Clubs Joined', value: user?.joinedClubs?.length || '0', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Events Registered', value: user?.registeredEvents?.length || '0', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`flex items-center p-4 rounded-lg shadow-sm ${stat.bg} border border-${stat.color.replace('text-', '')}`}>
          <stat.icon className={`w-6 h-6 ${stat.color}`} />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsDashboard;
