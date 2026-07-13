import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import { authAPI } from '../../services/api';
import ProfileHeader from './components/ProfileHeader';
import InfoSection from './components/InfoSection';
import StatsDashboard from './components/StatsDashboard';
import ClubsSection from './components/ClubsSection';
import EventsSection from './components/EventsSection';
import AchievementsSection from './components/AchievementsSection';
import SettingsSection from './components/SettingsSection';
import AdminSection from './components/AdminSection';
import EditProfileModal from './components/EditProfileModal';
import { Calendar, Activity, LogOut } from 'lucide-react';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Default User Data merged with MongoDB data
  const [user, setUser] = useState({
    name: '',
    studentId: '',
    email: '',
    personalEmail: '',
    department: '',
    year: '',
    semester: '',
    course: '',
    section: '',
    role: 'Student', // 'Student', 'Club Member', 'Club Leader', 'Admin'
    bio: '',
    gender: '',
    dob: '',
    phone: '',
    address: '',
    profilePic: '',
    joinedClubs: [],
    registeredEvents: []
  });

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const dbUser = response.data.user;
      
      setUser(prev => ({
        ...prev,
        ...dbUser, // Merge all db fields
        role: dbUser.role === 'admin' ? 'Admin' : (dbUser.role === 'club_leader' ? 'Club Leader' : (dbUser.role === 'club_member' ? 'Club Member' : 'Student')),
        joinedClubs: dbUser.joinedClubs || [],
        registeredEvents: dbUser.registeredEvents || []
      }));
    } catch (error) {
      setToast({ message: 'Error loading profile from database', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleProfileSave = (updatedUser) => {
    setUser(prev => ({
      ...prev,
      ...updatedUser,
      role: updatedUser.role === 'admin' ? 'Admin' : (updatedUser.role === 'club_leader' ? 'Club Leader' : (updatedUser.role === 'club_member' ? 'Club Member' : 'Student')),
    }));
    setIsEditing(false);
    setToast({ message: 'Profile updated successfully!', type: 'success' });

    // Persist to localStorage so other pages see updated data
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...updatedUser }));
  };

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {isEditing && (
        <EditProfileModal 
          user={user} 
          onClose={() => setIsEditing(false)} 
          onSave={handleProfileSave} 
        />
      )}

      <main className="page-section pt-8 pb-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-800">
          {/* Profile Header */}
          <ProfileHeader user={user} setUser={setUser} onEditClick={() => setIsEditing(true)} />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Info & Stats */}
          <div className="lg:col-span-1 space-y-8">
            <InfoSection user={user} />
            <StatsDashboard user={user} />
            
            {/* Calendar Mini */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4 text-gray-700">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Upcoming Schedule</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm border-l-2 border-indigo-500 pl-3">
                  <div className="text-gray-500 w-12 text-right font-medium">10 AM</div>
                  <div>
                    <p className="font-semibold text-gray-800">Coding Club Meeting</p>
                    <p className="text-gray-500">Room 402</p>
                  </div>
                </li>
                <li className="flex gap-3 text-sm border-l-2 border-green-500 pl-3">
                  <div className="text-gray-500 w-12 text-right font-medium">2 PM</div>
                  <div>
                    <p className="font-semibold text-gray-800">AI Workshop</p>
                    <p className="text-gray-500">Main Auditorium</p>
                  </div>
                </li>
              </ul>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4 text-gray-700">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Recent Activity</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-gray-800">Joined <span className="font-semibold">Robotics Club</span></p>
                    <p className="text-gray-500 text-xs">2 days ago</p>
                  </div>
                </li>
                <li className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500"></div>
                  <div>
                    <p className="text-gray-800">Registered for <span className="font-semibold">Hackathon 2026</span></p>
                    <p className="text-gray-500 text-xs">5 days ago</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Right Column - Clubs, Events, Settings */}
          <div className="lg:col-span-2 space-y-8">
            {(user.role === 'Admin' || user.role === 'Club Leader') && (
              <AdminSection role={user.role} />
            )}
            
            <ClubsSection user={user} />
            <EventsSection user={user} />
            <AchievementsSection />
            <SettingsSection />
            
            <div className="flex justify-end pt-4">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
                <LogOut className="w-5 h-5" />
                Logout Account
              </button>
            </div>
          </div>
          
        </div>
      </div>
      </main>
    </div>
  );
};

export default ProfilePage;
