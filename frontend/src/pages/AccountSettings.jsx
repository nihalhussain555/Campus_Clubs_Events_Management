import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { Save, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react';

const AccountSettings = () => {
  const [initialUser, setInitialUser] = useState(null);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Password fields
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await authAPI.getProfile();
        setInitialUser(data.user);
        setUser(data.user);
      } catch (err) {
        setToast({ message: 'Failed to load profile', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleReset = () => {
    setUser(initialUser);
    setToast({ message: 'Changes reset', type: 'info' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(user);
      setInitialUser(user);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, ...user }));
      setToast({ message: 'Profile updated', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Update failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    if (!currentPwd || !newPwd || !confirmPwd) return false;
    if (newPwd !== confirmPwd) return false;
    if (newPwd.length < 6) return false;
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      setToast({ message: 'Password validation failed', type: 'error' });
      return;
    }
    setPwdLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setToast({ message: 'Password changed', type: 'success' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Password change failed', type: 'error' });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading account settings..." />;

  return (
    <div className="page-container max-w-4xl mx-auto py-8 px-4 space-y-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Edit Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile Picture */}
          <div className="col-span-2 flex items-center space-x-4">
            <img
              src={user.profilePic || '/default-avatar.png'}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border"
            />
            <label className="flex-1">
              <span className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setUser(prev => ({ ...prev, profilePic: reader.result }));
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </label>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={user.name || ''}
              onChange={e => setUser({ ...user, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Personal Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
            <input
              type="email"
              value={user.personalEmail || ''}
              onChange={e => setUser({ ...user, personalEmail: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={user.phone || ''}
              onChange={e => setUser({ ...user, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={user.department || ''}
              onChange={e => setUser({ ...user, department: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <input
              type="text"
              value={user.course || ''}
              onChange={e => setUser({ ...user, course: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              min="1"
              max="5"
              value={user.year || ''}
              onChange={e => setUser({ ...user, year: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <input
              type="number"
              min="1"
              max="2"
              value={user.semester || ''}
              onChange={e => setUser({ ...user, semester: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <input
              type="text"
              value={user.section || ''}
              onChange={e => setUser({ ...user, section: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Student/Employee ID (read‑only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student / Employee ID</label>
            <input
              type="text"
              value={user.studentId || user.employeeId || ''}
              readOnly
              className="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm sm:text-sm cursor-not-allowed"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={user.gender || ''}
              onChange={e => setUser({ ...user, gender: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={user.dob ? user.dob.split('T')[0] : ''}
              onChange={e => setUser({ ...user, dob: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Address */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              rows={3}
              value={user.address || ''}
              onChange={e => setUser({ ...user, address: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Bio */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              rows={4}
              value={user.bio || ''}
              onChange={e => setUser({ ...user, bio: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </section>

      {/* Change Password Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Change Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute inset-y-0 right-0 flex items-center px-2"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={pwdLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {pwdLoading ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
          Update Password
        </button>
      </section>
    </div>
  );
};

export default AccountSettings;
