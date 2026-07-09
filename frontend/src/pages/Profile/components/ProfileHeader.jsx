import React from 'react';
import { Camera, Edit2 } from 'lucide-react';

const ProfileHeader = ({ user, setUser, onEditClick }) => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Club Leader': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Club Member': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Cover Photo Area */}
      <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
        <button onClick={onEditClick} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-lg transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="px-6 sm:px-10 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-12 mb-6">
          {/* Profile Picture */}
          <div className="relative group">
            <img 
              src={user.profilePic || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+BAQAE/AL+LVgAAAAASUVORK5CYII='} 
              alt={user.name} 
              className="w-28 h-28 rounded-full border-4 border-white shadow-md object-cover bg-white"
            />
            <button onClick={onEditClick} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {user.name}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </h1>
                <p className="text-gray-500 font-medium">{user.department || 'Add Department'} • {user.year || 'Add Year'} ({user.semester || 'Add Semester'})</p>
              </div>
              <button onClick={onEditClick} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-gray-600 italic">"{user.bio}"</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
