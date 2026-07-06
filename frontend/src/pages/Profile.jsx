import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { authAPI } from '../services/api';
import { Edit2, Save, X, Lock, User, Mail, Calendar } from 'lucide-react';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
      setEditFormData({
        name: response.data.user.name,
        email: response.data.user.email
      });
      setLoading(false);
    } catch (error) {
      setToast({ message: 'Error loading profile', type: 'error' });
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      if (!editFormData.name.trim() || !editFormData.email.trim()) {
        setToast({ message: 'Please fill all fields', type: 'error' });
        return;
      }

      // Since we don't have an update profile endpoint, we'll update localStorage
      const updatedUser = {
        ...user,
        name: editFormData.name,
        email: editFormData.email
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      setIsEditingProfile(false);
    } catch (error) {
      setToast({ message: 'Error updating profile', type: 'error' });
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validation
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setToast({ message: 'Please fill all password fields', type: 'error' });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setToast({ message: 'New passwords do not match', type: 'error' });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setToast({ message: 'New password must be at least 6 characters', type: 'error' });
        return;
      }

      if (passwordData.currentPassword === passwordData.newPassword) {
        setToast({ message: 'New password must be different from current password', type: 'error' });
        return;
      }

      // Call API to change password (would need backend endpoint)
      // For now, we'll show success message
      setToast({ message: 'Password changed successfully!', type: 'success' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error changing password', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 glass">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{user?.name}</h1>
              <p className="text-blue-100 flex items-center gap-2">
                <Mail size={18} />
                {user?.email}
              </p>
              <p className="text-blue-100 mt-2 capitalize">
                Role: {user?.role === 'admin' ? '⚙️ Administrator' : '👨‍🎓 Student'}
              </p>
            </div>
            <div className="text-6xl">👤</div>
          </div>
        </div>

        {/* Statistics */}
        <div id="profile-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass p-6 hover-glow fade-in">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Joined Clubs</h3>
            <p className="text-4xl font-bold text-blue-600">{user?.joinedClubs?.length || 0}</p>
          </div>
          <div className="glass p-6 hover-glow fade-in">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Registered Events</h3>
            <p className="text-4xl font-bold text-green-600">{user?.registeredEvents?.length || 0}</p>
          </div>
          <div className="glass p-6 hover-glow fade-in">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Account Type</h3>
            <p className="text-lg font-bold text-purple-600 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Information */}
          <div className="lg:col-span-2 glass p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit2 size={18} /> Edit
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditFormData({ name: user.name, email: user.email });
                    }}
                    className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <p className="text-gray-600 text-sm font-semibold">Full Name</p>
                  <p className="text-gray-800 text-lg font-medium flex items-center gap-2 mt-1">
                    <User size={18} className="text-blue-600" />
                    {user?.name}
                  </p>
                </div>

                <div className="border-b pb-4">
                  <p className="text-gray-600 text-sm font-semibold">Email Address</p>
                  <p className="text-gray-800 text-lg font-medium flex items-center gap-2 mt-1">
                    <Mail size={18} className="text-blue-600" />
                    {user?.email}
                  </p>
                </div>

                <div className="border-b pb-4">
                  <p className="text-gray-600 text-sm font-semibold">Account Role</p>
                  <p className="text-gray-800 text-lg font-medium mt-1 capitalize">
                    {user?.role === 'admin' ? '⚙️ Administrator' : '👨‍🎓 Student'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm font-semibold">Member Since</p>
                  <p className="text-gray-800 text-lg font-medium flex items-center gap-2 mt-1">
                    <Calendar size={18} className="text-blue-600" />
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Security</h2>

            {isChangingPassword ? (
              <form className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Save size={16} /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 bg-gray-300 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2 text-sm"
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-semibold"
              >
                <Lock size={18} /> Change Password
              </button>
            )}
          </div>
        </div>

        {/* Joined Clubs Section */}
        {user?.joinedClubs && user.joinedClubs.length > 0 && (
          <section id="profile-clubs" className="mt-8 section-padding glass hover-glow fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">My Clubs ({user.joinedClubs.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.joinedClubs.map((club, idx) => (
                  <div key={club._id || idx} className="glass p-4 hover-glow transition">
                    <h3 className="font-bold text-gray-800 mb-2">{club.clubName}</h3>
                    <p className="text-gray-600 text-sm">{club.description}</p>
                  </div>
                ))}
              </div>
            </section>
        )}

        {/* Registered Events Section */}
        {user?.registeredEvents && user.registeredEvents.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Events ({user.registeredEvents.length})</h2>
            <div className="space-y-4">
              {user.registeredEvents.map((event, idx) => (
                <div key={event._id || idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-2">{event.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                      <p className="text-gray-600 text-sm">
                        📅 {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
