import React from 'react';
import { Award, Trophy, Star, Medal } from 'lucide-react';

const AchievementsSection = () => {
  const achievements = [
    { title: 'Best Volunteer 2025', category: 'Award', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-100' },
    { title: 'Hackathon Finalist', category: 'Badge', icon: Medal, color: 'text-purple-500', bg: 'bg-purple-100' },
    { title: 'President, Coding Club', category: 'Leadership', icon: Star, color: 'text-blue-500', bg: 'bg-blue-100' },
    { title: 'React Expert', category: 'Certificate', icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Achievements
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((ach, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-1 bg-gradient-to-b from-white to-gray-50">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${ach.bg}`}>
                <ach.icon className={`w-6 h-6 ${ach.color}`} />
              </div>
              <h4 className="font-bold text-gray-800 mb-1 leading-tight">{ach.title}</h4>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{ach.category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsSection;
