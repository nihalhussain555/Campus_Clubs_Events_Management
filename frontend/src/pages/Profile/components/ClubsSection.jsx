import React from 'react';
import { Users, ExternalLink } from 'lucide-react';

const ClubsSection = ({ user }) => {
  const clubs = user?.joinedClubs?.length > 0 
    ? user.joinedClubs.map(club => ({
        name: club.clubName || club.name,
        role: club.role || 'Member',
        joined: '2026',
        logo: club.logo || '🎓',
        color: 'bg-indigo-100 text-indigo-700'
      }))
    : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Club Memberships
        </h3>
      </div>
      <div className="p-6">
        {clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map((club, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-gray-400 hover:text-indigo-600">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-2xl shadow-sm mb-3">
                    {club.logo}
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">{club.name}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3 ${club.color}`}>
                    {club.role}
                  </span>
                  <p className="text-xs text-gray-500">Joined {club.joined}</p>
                  <button className="mt-4 w-full py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg transition-colors border border-gray-100 hover:border-indigo-100">
                    View Club
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <p className="text-gray-500 font-medium">You haven't joined any clubs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsSection;
