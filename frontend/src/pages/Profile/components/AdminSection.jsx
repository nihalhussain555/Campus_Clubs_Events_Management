import React from 'react';
import { ShieldCheck, Users, CalendarDays, Edit3, Trash2, Download, BarChart2 } from 'lucide-react';

const AdminSection = ({ role }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-100 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
      <div className="px-6 py-5 border-b border-gray-100 bg-indigo-50/30">
        <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" /> 
          {role === 'Admin' ? 'Admin Controls' : 'Club Leader Dashboard'}
        </h3>
        <p className="text-sm text-indigo-600/70 mt-1 ml-7">Manage your clubs, events, and view analytics.</p>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Managed Clubs */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
            <Users className="w-4 h-4 text-indigo-500" /> Managed Clubs
          </h4>
          <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-bold text-gray-900">Photography Club</h5>
                <p className="text-xs text-gray-500">Role: President</p>
              </div>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                124 Members
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-4">
              <span className="text-amber-600 font-medium text-xs">5 Pending Requests</span>
              <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs">
                Manage Club &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Created Events */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" /> Recent Created Events
          </h4>
          <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-bold text-gray-900">Campus Photo Walk</h5>
                <p className="text-xs text-gray-500">Aug 15, 2026</p>
              </div>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                89 Registered
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 rounded" title="Edit">
                <Edit3 className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 rounded" title="View Analytics">
                <BarChart2 className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 rounded" title="Export List">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded ml-auto" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSection;
