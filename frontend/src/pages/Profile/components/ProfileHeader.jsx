import React from 'react';
import { Camera, Edit2, BookOpen, GraduationCap, Hash, CalendarDays, Info } from 'lucide-react';

const ProfileHeader = ({ user, setUser, onEditClick }) => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-100';
      case 'Club Leader': return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
      case 'Club Member': return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 ring-gray-100';
    }
  };

  const getFallback = (value) => value ? value : <span className="text-gray-400 italic">Not Added</span>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      {/* Cover Banner */}
      <div className="h-40 sm:h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 relative">
        <button 
          onClick={onEditClick} 
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          aria-label="Edit Cover"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="px-6 sm:px-8 pb-8 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 -mt-16 sm:-mt-20">
          
          {/* Profile Picture */}
          <div className="relative group shrink-0">
            <div className="p-1.5 bg-white rounded-full shadow-md">
              <img 
                src={user.profilePic || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+BAQAE/AL+LVgAAAAASUVORK5CYII='} 
                alt={user.name} 
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border border-gray-100 bg-gray-50"
              />
            </div>
            <button 
              onClick={onEditClick} 
              className="absolute inset-1.5 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[2px]"
            >
              <Camera className="w-8 h-8 text-white shadow-sm" />
            </button>
          </div>
          
          {/* Profile Info */}
          <div className="flex-1 w-full pt-2 sm:pt-20">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight truncate max-w-full">
                    {user.name || 'Anonymous User'}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ring-4 whitespace-nowrap shadow-sm ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                
                {/* Meta details list */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mt-3 text-sm text-gray-600 font-medium">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span className="truncate max-w-[200px]">{getFallback(user.department)}</span>
                    <span className="text-gray-300 mx-0.5">•</span>
                    <span className="truncate max-w-[150px]">{getFallback(user.course)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <span>{getFallback(user.year)}</span>
                    <span className="text-gray-300 mx-0.5">•</span>
                    <span>{getFallback(user.semester)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                    <Hash className="w-4 h-4 text-indigo-500" />
                    <span>{getFallback(user.studentId)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                    <CalendarDays className="w-4 h-4" />
                    <span>
                      {user.createdAt 
                        ? `Joined ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` 
                        : 'Member Since: Not Added'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Edit Button */}
              <div className="hidden sm:block shrink-0 ml-4">
                <button 
                  onClick={onEditClick} 
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 text-sm font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" /> 
                  Edit Profile
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Edit Button */}
        <div className="block sm:hidden mt-6">
          <button 
            onClick={onEditClick} 
            className="w-full py-2.5 bg-white border-2 border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 text-sm font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        {/* Bio Section */}
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Info className="w-4 h-4 text-indigo-500" /> About Me
          </h3>
          <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100/80">
            {user.bio ? (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {user.bio}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-gray-500 text-sm font-medium mb-2">No bio added yet.</p>
                <button onClick={onEditClick} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">
                  + Add a short bio
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileHeader;
