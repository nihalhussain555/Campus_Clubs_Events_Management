import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import Navbar from "../components/Navbar";

import {
  ArrowLeft,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  User,
  ShieldCheck,
  Bell,
  CreditCard,Camera,Mail,Phone,MapPin,CalendarDays,GraduationCap,Building2,Hash,CheckCircle2,Smartphone,BellRing,Megaphone,RotateCcw
} from 'lucide-react';

const AccountSettings = () => {
  const [initialUser, setInitialUser] = useState(null);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Password
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
        setToast({
          message: 'Failed to load profile',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleReset = () => {
    setUser(initialUser);

    setToast({
      message: 'Changes reset',
      type: 'info'
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await authAPI.updateProfile(user);

      setInitialUser(user);

      const stored = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...stored,
          ...user
        })
      );

      setToast({
        message: 'Profile updated successfully',
        type: 'success'
      });
    } catch (err) {
      setToast({
        message:
          err.response?.data?.message ||
          'Failed to update profile',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      return false;
    }

    if (newPwd !== confirmPwd) {
      return false;
    }

    if (newPwd.length < 6) {
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      setToast({
        message:
          'Please check your password fields. New password must match and contain at least 6 characters.',
        type: 'error'
      });

      return;
    }

    setPwdLoading(true);

    try {
      await authAPI.changePassword({
        currentPassword: currentPwd,
        newPassword: newPwd
      });

      setToast({
        message: 'Password changed successfully',
        type: 'success'
      });

      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setToast({
        message:
          err.response?.data?.message ||
          'Password change failed',
        type: 'error'
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const updateUser = (field, value) => {
    setUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <LoadingSpinner message="Loading account settings..." />
    );
  }

  return (
    <>
      <Navbar />
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">

        {/* PAGE HEADER */}
        <div className="mb-8">

          {/* Back Button */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-3.5 py-2 mb-5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 text-sm font-medium shadow-sm"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
              <User
                size={22}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Account & Settings
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Manage your profile, security and preferences
              </p>
            </div>
          </div>

        </div>

        {/* =====================================================
            EDIT PROFILE
        ===================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">

          {/* Section Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <User
                  size={20}
                  className="text-indigo-600"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Profile
                </h2>

                <p className="text-sm text-slate-500">
                  Update your personal and academic information
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">

            {/* PROFILE IMAGE */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 mb-6 border-b border-slate-100">

              <div className="relative">
                <img
                  src={
                    user.profilePic ||
                    '/default-avatar.png'
                  }
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-1 ring-slate-200"
                />

                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center">
                  <Camera
                    size={15}
                    className="text-white"
                  />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-slate-900">
                  Profile Picture
                </h3>

                <p className="text-sm text-slate-500 mt-1 mb-3">
                  Upload a JPG, PNG or WEBP image.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-indigo-100 transition">
                  <Camera size={16} />
                  Choose Image

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file =
                        e.target.files[0];

                      if (file) {
                        const reader =
                          new FileReader();

                        reader.onloadend = () =>
                          updateUser(
                            'profilePic',
                            reader.result
                          );

                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* PROFILE FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

              {/* Full Name */}
              <div>
                <label className="settings-label">
                  Full Name
                </label>

                <div className="input-wrapper">
                  <User size={17} />

                  <input
                    type="text"
                    value={user.name || ''}
                    onChange={e =>
                      updateUser(
                        'name',
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="settings-label">
                  Username
                </label>

                <div className="input-wrapper">
                  <Hash size={17} />

                  <input
                    type="text"
                    value={user.username || ''}
                    onChange={e =>
                      updateUser(
                        'username',
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="settings-label">
                  Email
                </label>

                <div className="input-wrapper">
                  <Mail size={17} />

                  <input
                    type="email"
                    value={user.email || ''}
                    onChange={e =>
                      updateUser(
                        'email',
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="settings-label">
                  Phone Number
                </label>

                <div className="input-wrapper">
                  <Phone size={17} />

                  <input
                    type="tel"
                    value={user.phone || ''}
                    onChange={e =>
                      updateUser(
                        'phone',
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="settings-label">
                  Department
                </label>

                <div className="input-wrapper">
                  <Building2 size={17} />

                  <input
                    type="text"
                    value={user.department || ''}
                    onChange={e =>
                      updateUser(
                        'department',
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              {/* Course */}
              <div>
                <label className="settings-label">
                  Course
                </label>

                <div className="input-wrapper">
                  <GraduationCap size={17} />

                  <input
                    type="text"
                    value={user.course || ''}
                    onChange={e =>
                      updateUser(
                        'course',
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="B.Tech"
                  />
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="settings-label">
                  Year
                </label>

                <input
                  type="number"
                  min="1"
                  max="5"
                  value={user.year || ''}
                  onChange={e =>
                    updateUser(
                      'year',
                      e.target.value
                    )
                  }
                  className="settings-input-simple"
                  placeholder="2"
                />
              </div>

              {/* Semester */}
              <div>
                <label className="settings-label">
                  Semester
                </label>

                <input
                  type="number"
                  min="1"
                  max="2"
                  value={user.semester || ''}
                  onChange={e =>
                    updateUser(
                      'semester',
                      e.target.value
                    )
                  }
                  className="settings-input-simple"
                  placeholder="4"
                />
              </div>

              {/* Section */}
              <div>
                <label className="settings-label">
                  Section
                </label>

                <input
                  type="text"
                  value={user.section || ''}
                  onChange={e =>
                    updateUser(
                      'section',
                      e.target.value
                    )
                  }
                  className="settings-input-simple"
                  placeholder="A"
                />
              </div>

              {/* Student ID */}
              <div>
                <label className="settings-label">
                  Student / Employee ID
                </label>

                <input
                  type="text"
                  value={
                    user.studentId ||
                    user.employeeId ||
                    ''
                  }
                  readOnly
                  className="settings-input-simple bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="settings-label">
                  Gender
                </label>

                <select
                  value={user.gender || ''}
                  onChange={e =>
                    updateUser(
                      'gender',
                      e.target.value
                    )
                  }
                  className="settings-input-simple"
                >
                  <option value="">
                    Select gender
                  </option>
                  <option value="Male">
                    Male
                  </option>
                  <option value="Female">
                    Female
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="settings-label">
                  Date of Birth
                </label>

                <div className="input-wrapper">
                  <CalendarDays size={17} />

                  <input
                    type="date"
                    value={
                      user.dob
                        ? user.dob.split('T')[0]
                        : ''
                    }
                    onChange={e =>
                      updateUser(
                        'dob',
                        e.target.value
                      )
                    }
                    className="settings-input"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="settings-label">
                  Address
                </label>

                <div className="textarea-wrapper">
                  <MapPin size={17} />

                  <textarea
                    rows={3}
                    value={user.address || ''}
                    onChange={e =>
                      updateUser(
                        'address',
                        e.target.value
                      )
                    }
                    className="settings-textarea"
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <label className="settings-label">
                  Bio
                </label>

                <textarea
                  rows={4}
                  value={user.bio || ''}
                  onChange={e =>
                    updateUser(
                      'bio',
                      e.target.value
                    )
                  }
                  className="settings-input-simple resize-none"
                  placeholder="Tell something about yourself..."
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-7 pt-6 border-t border-slate-100">

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition"
              >
                <RotateCcw size={16} />
                Reset
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm transition disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={16} />
                )}

                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            SECURITY
        ===================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">

          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ShieldCheck
                  size={20}
                  className="text-amber-600"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Security
                </h2>

                <p className="text-sm text-slate-500">
                  Protect your account and manage your password
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Current */}
              <div>
                <label className="settings-label">
                  Current Password
                </label>

                <div className="password-wrapper">
                  <Lock size={17} />

                  <input
                    type={
                      showPwd
                        ? 'text'
                        : 'password'
                    }
                    value={currentPwd}
                    onChange={e =>
                      setCurrentPwd(
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="Current password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPwd(!showPwd)
                    }
                    className="password-toggle"
                  >
                    {showPwd ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* New */}
              <div>
                <label className="settings-label">
                  New Password
                </label>

                <div className="password-wrapper">
                  <Lock size={17} />

                  <input
                    type={
                      showPwd
                        ? 'text'
                        : 'password'
                    }
                    value={newPwd}
                    onChange={e =>
                      setNewPwd(
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="New password"
                  />
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="settings-label">
                  Confirm New Password
                </label>

                <div className="password-wrapper">
                  <Lock size={17} />

                  <input
                    type={
                      showPwd
                        ? 'text'
                        : 'password'
                    }
                    value={confirmPwd}
                    onChange={e =>
                      setConfirmPwd(
                        e.target.value
                      )
                    }
                    className="settings-input"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={pwdLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm transition disabled:opacity-50"
              >
                {pwdLoading ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Lock size={16} />
                )}

                {pwdLoading
                  ? 'Updating...'
                  : 'Update Password'}
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            NOTIFICATIONS
        ===================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">

          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bell
                  size={20}
                  className="text-blue-600"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h2>

                <p className="text-sm text-slate-500">
                  Choose how you want to receive updates
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">

            {/* Email */}
            <NotificationRow
              icon={<Mail size={18} />}
              title="Email Notifications"
              description="Receive important updates and announcements by email"
              checked={user.emailNotifications ?? true}
              onChange={value =>
                updateUser(
                  'emailNotifications',
                  value
                )
              }
            />

            {/* SMS */}
            <NotificationRow
              icon={<Smartphone size={18} />}
              title="SMS Notifications"
              description="Receive important alerts through SMS"
              checked={user.smsNotifications ?? false}
              onChange={value =>
                updateUser(
                  'smsNotifications',
                  value
                )
              }
            />

            {/* Push */}
            <NotificationRow
              icon={<Megaphone size={18} />}
              title="Push Notifications"
              description="Get real-time notifications from the application"
              checked={user.pushNotifications ?? true}
              onChange={value =>
                updateUser(
                  'pushNotifications',
                  value
                )
              }
            />

            {/* Events */}
            <NotificationRow
              icon={<BellRing size={18} />}
              title="Event Reminders"
              description="Get reminders before registered events begin"
              checked={user.eventReminders ?? true}
              onChange={value =>
                updateUser(
                  'eventReminders',
                  value
                )
              }
            />

            {/* Membership */}
            <NotificationRow
              icon={<CalendarDays size={18} />}
              title="Membership Renewal Alerts"
              description="Receive reminders about membership expiration and renewal"
              checked={user.membershipAlerts ?? true}
              onChange={value =>
                updateUser(
                  'membershipAlerts',
                  value
                )
              }
            />
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Notification preferences are saved when you click
              <span className="font-medium text-slate-700">
                {' '}Save Changes
              </span>
              {' '}in your profile settings.
            </p>
          </div>
        </section>

        {/* =====================================================
            MEMBERSHIP & BILLING
        ===================================================== */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CreditCard
                  size={20}
                  className="text-emerald-600"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Membership & Billing
                </h2>

                <p className="text-sm text-slate-500">
                  View your membership status and billing information
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Membership Status */}
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">
                    Membership Status
                  </span>

                  <CheckCircle2
                    size={19}
                    className="text-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">

                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {user.membershipStatus ||
                      'Active'}
                  </span>

                </div>
              </div>

              {/* Payment */}
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">

                <div className="flex items-center gap-3 mb-3">
                  <CreditCard
                    size={18}
                    className="text-slate-500"
                  />

                  <span className="text-sm font-medium text-slate-600">
                    Payment Method
                  </span>
                </div>

                <p className="text-base font-semibold text-slate-900">
                  {user.paymentMethod ||
                    'Not Added'}
                </p>
              </div>
            </div>

            {/* Billing History */}
            <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">

              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">
                  Billing History
                </h3>
              </div>

              <div className="p-6 text-center">

                <CreditCard
                  size={30}
                  className="mx-auto text-slate-300 mb-3"
                />

                <p className="text-sm font-medium text-slate-700">
                  No billing history
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Your payment transactions will appear here.
                </p>

              </div>
            </div>
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>

      {/* =====================================================
          COMPONENT STYLES
      ===================================================== */}
      <style>
        {`
          .settings-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: #334155;
            margin-bottom: 0.5rem;
          }

          .settings-input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: #0f172a;
            font-size: 0.875rem;
            padding: 0.65rem 0;
          }

          .settings-input::placeholder {
            color: #94a3b8;
          }

          .settings-input-simple {
            width: 100%;
            min-height: 44px;
            padding: 0.65rem 0.8rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.625rem;
            background: white;
            color: #0f172a;
            font-size: 0.875rem;
            outline: none;
            transition: all 0.2s ease;
          }

          .settings-input-simple:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .input-wrapper {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            min-height: 44px;
            padding: 0 0.8rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.625rem;
            background: white;
            color: #94a3b8;
            transition: all 0.2s ease;
          }

          .input-wrapper:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .textarea-wrapper {
            display: flex;
            align-items: flex-start;
            gap: 0.65rem;
            padding: 0.75rem 0.8rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.625rem;
            background: white;
            color: #94a3b8;
            transition: all 0.2s ease;
          }

          .textarea-wrapper:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .settings-textarea {
            width: 100%;
            border: none;
            outline: none;
            resize: vertical;
            min-height: 70px;
            background: transparent;
            color: #0f172a;
            font-size: 0.875rem;
          }

          .settings-textarea::placeholder {
            color: #94a3b8;
          }

          .password-wrapper {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            min-height: 44px;
            padding: 0 0.8rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.625rem;
            background: white;
            color: #94a3b8;
            transition: all 0.2s ease;
          }

          .password-wrapper:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .password-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            padding: 0.25rem;
            border-radius: 0.375rem;
            transition: 0.2s ease;
          }

          .password-toggle:hover {
            background: #f1f5f9;
            color: #334155;
          }
        `}
      </style>
    </div>
    </>
  );
};


/* ============================================================
   NOTIFICATION ROW
============================================================ */

const NotificationRow = ({
  icon,
  title,
  description,
  checked,
  onChange
}) => {
  return (
    <div className="px-6 py-5 flex items-center justify-between gap-5 hover:bg-slate-50/70 transition">

      <div className="flex items-center gap-4 min-w-0">

        <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* SWITCH */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          ${checked
            ? 'bg-indigo-600'
            : 'bg-slate-300'
          }
        `}
      >
        <span
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${checked
              ? 'translate-x-6'
              : 'translate-x-1'
            }
          `}
        />
      </button>
    </div>
  );
};

export default AccountSettings;