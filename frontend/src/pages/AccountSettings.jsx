import React, { useState, useEffect } from 'react';
import {
  authAPI,
  certificateAPI,
  eventAPI,
  gamificationAPI,
  notificationAPI
} from '../services/api';
import Toast from '../components/Toast';
import Navbar from "../components/Navbar";
import LoadingScreen from '../components/LoadingScreen';
import { useTheme } from '../hooks/useTheme';
import {
  downscaleImage,
  isSupportedImage,
  MAX_UPLOAD_BYTES
} from '../utils/imageUpload';
import {
  PASSWORD_REQUIREMENT_TEXT,
  PASSWORD_RULES,
  meetsPasswordPolicy,
  passwordStrength
} from '../utils/passwordPolicy';

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
  Camera,Mail,Phone,MapPin,CalendarDays,GraduationCap,Building2,Hash,CheckCircle2,Smartphone,BellRing,Megaphone,RotateCcw,
  Sun,
  Moon,
  Monitor,
  FileDown,
  Database,
  Check,
  X
} from 'lucide-react';

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'activity', label: 'Activity' },
  { id: 'data', label: 'Data & privacy' }
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
];

const COMPLETENESS_FIELDS = [
  ['name', 'full name'],
  ['username', 'username'],
  ['email', 'email'],
  ['phone', 'phone number'],
  ['department', 'department'],
  ['course', 'course'],
  ['year', 'year'],
  ['semester', 'semester'],
  ['section', 'section'],
  ['gender', 'gender'],
  ['dob', 'date of birth'],
  ['address', 'address'],
  ['bio', 'bio'],
  ['profilePic', 'profile photo']
];

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === '';

// Check-in and verification tokens are capabilities, not personal data: anyone
// holding one can act for the student, so they never go into a downloadable file.
const SENSITIVE_KEY = /token|password|secret/i;

const scrub = (value) => {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((clean, [key, item]) => {
    if (!SENSITIVE_KEY.test(key)) {
      clean[key] = scrub(item);
    }

    return clean;
  }, {});
};

const AccountSettings = () => {
  const [initialUser, setInitialUser] = useState(null);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [exporting, setExporting] = useState(false);

  // Password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const { theme, mode, setThemeMode } = useTheme();

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

    if (!meetsPasswordPolicy(newPwd)) {
      return false;
    }

    if (newPwd === currentPwd) {
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      setToast({
        message: !newPwd || !confirmPwd || newPwd !== confirmPwd
          ? 'Please fill both new password fields and make them match.'
          : PASSWORD_REQUIREMENT_TEXT +
            ', and it must differ from your current password.',
        type: 'error'
      });

      return;
    }

    setPwdLoading(true);

    try {
      const { data } = await authAPI.changePassword({
        currentPassword: currentPwd,
        newPassword: newPwd
      });

      // Changing the password revokes the token that made this request, so the
      // replacement the backend returns has to be stored immediately.
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

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

  const handleProfilePic = async (file) => {
    if (!file) return;

    if (!isSupportedImage(file)) {
      setToast({
        message: 'Please choose a PNG, JPG or WEBP image',
        type: 'error'
      });

      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setToast({
        message: 'That image is over 8 MB. Please choose a smaller one.',
        type: 'error'
      });

      return;
    }

    try {
      const dataUrl = await downscaleImage(file, 512);

      updateUser('profilePic', dataUrl);

      setToast({
        message: 'Image ready. Press Save to apply it.',
        type: 'success'
      });
    } catch (error) {
      setToast({
        message: error.message || 'Could not read that image',
        type: 'error'
      });
    }
  };

  // The section nav follows the page rather than the other way round, so the
  // highlighted tab stays honest when the reader scrolls by hand.
  useEffect(() => {
    if (loading) return;

    const nodes = SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: '-25% 0px -55% 0px' }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    setActiveSection(id);
  };

  // Assembled entirely from endpoints the app already calls, so exporting adds
  // no new server surface and reveals nothing the student cannot already see.
  const downloadMyData = async () => {
    setExporting(true);

    const read = (result) =>
      result.status === 'fulfilled'
        ? result.value.data?.user ?? result.value.data ?? null
        : 'Unavailable';

    const [
      profile,
      history,
      certificates,
      notifications,
      summary,
      xpHistory
    ] = await Promise.allSettled([
      authAPI.getProfile(),
      eventAPI.getMyEventHistory(),
      certificateAPI.getMyCertificates(),
      notificationAPI.getAllNotifications(),
      gamificationAPI.getMySummary(),
      gamificationAPI.getXpHistory({ limit: 200 })
    ]);

    const bundle = scrub({
      exportedAt: new Date().toISOString(),
      account: read(profile),
      eventHistory: read(history),
      certificates: read(certificates),
      notifications: read(notifications),
      gamification: {
        standing: read(summary),
        xpLedger: read(xpHistory)
      }
    });

    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], {
          type: 'application/json'
        })
      );

      const link = document.createElement('a');

      link.href = url;
      link.download = `campus-clubs-my-data-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setToast({
        message: 'Your data has been downloaded',
        type: 'success'
      });
    } catch (error) {
      setToast({
        message: 'Your browser blocked the download',
        type: 'error'
      });
    } finally {
      setExporting(false);
    }
  };

  const missingFields = COMPLETENESS_FIELDS
    .filter(([field]) => isEmpty(user?.[field]))
    .map(([, label]) => label);

  const completeness = Math.round(
    ((COMPLETENESS_FIELDS.length - missingFields.length) /
      COMPLETENESS_FIELDS.length) *
      100
  );

  const isDirty =
    initialUser !== null &&
    JSON.stringify(user) !== JSON.stringify(initialUser);

  const strength = passwordStrength(newPwd);

  const passwordMismatch = Boolean(confirmPwd) && confirmPwd !== newPwd;

  if (loading) {
    return (
      <LoadingScreen message="Loading account settings..." />
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
            <div className="settings-tile">
              <User size={22} />
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

          {/* PROFILE COMPLETENESS */}
          <div className="app-card mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                Profile completeness
              </p>

              <p className="text-sm font-bold text-[#145f82]">
                {completeness}%
              </p>
            </div>

            <div className="xp-track mt-3">
              <div
                className="xp-fill"
                style={{ width: `${completeness}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {missingFields.length === 0
                ? 'Everything is filled in. Your profile is complete.'
                : `Still missing: ${missingFields
                    .slice(0, 4)
                    .join(', ')}${
                    missingFields.length > 4
                      ? ` and ${missingFields.length - 4} more`
                      : ''
                  }.`}
            </p>
          </div>

        </div>

        {/* SECTION NAV */}
        <div className="settings-nav">
          <nav aria-label="Settings sections">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={
                  activeSection === id
                    ? 'jump-link jump-link-active'
                    : 'jump-link'
                }
              >
                {label}
              </button>
            ))}
          </nav>

          {isDirty && (
            <span className="unsaved-chip">
              Unsaved changes
            </span>
          )}
        </div>

        {/* =====================================================
            EDIT PROFILE
        ===================================================== */}
        <section id="profile" className="settings-section">

          {/* Section Header */}
          <div className="settings-section-head">
            <div className="settings-tile">
              <User size={20} />
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

                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#2d7a9b] border-2 border-white flex items-center justify-center">
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

                <label className="btn-soft cursor-pointer">
                  <Camera size={16} />
                  Choose Image

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      handleProfilePic(e.target.files[0]);
                      e.target.value = '';
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
                  className="settings-input-simple settings-input-readonly"
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
                disabled={!isDirty}
                className="btn-secondary"
              >
                <RotateCcw size={16} />
                Reset
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="btn-primary"
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
            APPEARANCE
        ===================================================== */}
        <section id="appearance" className="settings-section">

          <div className="settings-section-head">
            <div className="settings-tile">
              <Moon size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Appearance
              </h2>

              <p className="text-sm text-slate-500">
                Choose how the app looks on this device
              </p>
            </div>
          </div>

          <div className="p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Theme
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {mode === 'system'
                    ? `Following your device setting, which is currently ${theme}.`
                    : `Locked to the ${theme} palette.`}
                </p>
              </div>

              <div className="segmented" role="group" aria-label="Theme">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setThemeMode(value)}
                    className={
                      mode === value
                        ? 'segment segment-active'
                        : 'segment'
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>

            </div>

            <p className="mt-5 text-xs text-slate-500">
              The choice is stored on this device only, applies to every page,
              and matches the toggle in the navigation bar.
            </p>
          </div>
        </section>

        {/* =====================================================
            SECURITY
        ===================================================== */}
        <section id="security" className="settings-section">

          <div className="settings-section-head">
            <div className="settings-tile">
              <ShieldCheck size={20} />
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

                <div className="mt-2 flex items-center gap-2">
                  <div className="xp-track flex-1">
                    <div
                      className="xp-fill"
                      style={{
                        width: `${strength.percent}%`,
                        background: strength.color
                      }}
                    />
                  </div>

                  <span
                    className="text-xs font-semibold whitespace-nowrap"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>

                {/* The button is gated on the same rules, so they are shown. */}
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {PASSWORD_RULES.map((rule) => {
                    const satisfied =
                      Boolean(newPwd) && rule.test(newPwd);

                    return (
                      <li
                        key={rule.id}
                        className={
                          satisfied
                            ? 'flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700'
                            : 'flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500'
                        }
                      >
                        {satisfied ? (
                          <Check size={13} />
                        ) : (
                          <X size={13} />
                        )}

                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
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

                <p
                  className={
                    !confirmPwd
                      ? 'mt-2 text-xs text-slate-500'
                      : passwordMismatch
                        ? 'mt-2 text-xs font-semibold text-red-600'
                        : 'mt-2 text-xs font-semibold text-green-600'
                  }
                >
                  {!confirmPwd
                    ? 'Re-type your new password'
                    : passwordMismatch
                      ? 'Passwords do not match'
                      : 'Passwords match'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {PASSWORD_REQUIREMENT_TEXT}. It also has to differ from the
                password you are replacing.
              </p>

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={pwdLoading}
                className="btn-primary"
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
        <section id="notifications" className="settings-section">

          <div className="settings-section-head">
            <div className="settings-tile">
              <Bell size={20} />
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

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Preferences are stored with your profile
              {isDirty ? ' and are not saved yet.' : '.'}
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="btn-primary"
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
                : 'Save preferences'}
            </button>
          </div>
        </section>

        {/* =====================================================
            MEMBERSHIP ACTIVITY
        ===================================================== */}
        <section id="activity" className="settings-section">

          <div className="settings-section-head">
            <div className="settings-tile">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Membership activity
              </h2>

              <p className="text-sm text-slate-500">
                A summary of your clubs, events and certificates
              </p>
            </div>
          </div>

          <div className="p-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <Building2 size={17} />
                  <span className="text-sm font-medium">
                    Clubs joined
                  </span>
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {user.joinedClubs?.length || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <CalendarDays size={17} />
                  <span className="text-sm font-medium">
                    Events registered
                  </span>
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {user.registeredEvents?.length || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <CheckCircle2 size={17} />
                  <span className="text-sm font-medium">
                    Certificates
                  </span>
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {user.certificates?.length || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <GraduationCap size={17} />
                  <span className="text-sm font-medium">
                    Member since
                  </span>
                </div>
                <p className="text-base font-semibold text-slate-900">
                  {user.createdAt
                    ? new Date(
                        user.createdAt
                      ).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—'}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            DATA & PRIVACY
        ===================================================== */}
        <section id="data" className="settings-section">

          <div className="settings-section-head">
            <div className="settings-tile">
              <FileDown size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Data &amp; privacy
              </h2>

              <p className="text-sm text-slate-500">
                Export the information the platform holds about you
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="max-w-xl">
                <h3 className="text-sm font-semibold text-slate-800">
                  Download a copy
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  A JSON file containing your profile, event history,
                  certificates, notifications and XP ledger. It is assembled
                  in your browser from the same pages you already use, so
                  nothing new is sent to the server.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadMyData}
                disabled={exporting}
                className="btn-secondary shrink-0"
              >

                {exporting ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <FileDown size={16} />
                )}

                {exporting
                  ? 'Preparing...'
                  : 'Download my data'}

              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-start gap-3">

                <Database
                  size={17}
                  className="mt-0.5 shrink-0 text-[#145f82]"
                />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    What is never included
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Your password is stored hashed and is never returned by
                    any endpoint. Check-in and certificate verification
                    tokens are stripped from the export as well, because
                    anyone holding one of those can act on your behalf.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* =====================================================
          COMPONENT STYLES
      ===================================================== */}
      <style>
        {`
          /* The page shell and its controls are driven from the app theme
             variables, so nothing here needs a separate dark override. */
          .settings-section {
            margin-bottom: 1.5rem;
            padding: 0;
            border: 1px solid var(--line);
            border-radius: 1rem;
            background: var(--panel);
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
            overflow: hidden;
            scroll-margin-top: 6.5rem;
          }

          .settings-section-head {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--line);
            background: var(--soft);
          }

          .settings-tile {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 2.75rem;
            height: 2.75rem;
            border-radius: 0.85rem;
            background: var(--blue-soft);
            color: var(--blue-strong);
          }

          .settings-nav {
            position: sticky;
            top: 5.5rem;
            z-index: 30;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            padding: 0.35rem 0.5rem;
            border: 1px solid var(--line);
            border-radius: 999px;
            background: var(--panel);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
          }

          .settings-nav nav {
            display: flex;
            flex: 1;
            gap: 0.25rem;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .settings-nav nav::-webkit-scrollbar {
            display: none;
          }

          .jump-link {
            padding: 0.5rem 0.85rem;
            border: none;
            border-radius: 999px;
            background: transparent;
            color: var(--muted);
            font-size: 0.8rem;
            font-weight: 600;
            white-space: nowrap;
            transition: all 0.2s ease;
          }

          .jump-link:hover {
            background: var(--soft);
            color: var(--ink);
          }

          .jump-link-active {
            background: var(--blue-soft);
            color: var(--blue-strong);
          }

          .unsaved-chip {
            flex-shrink: 0;
            padding: 0.35rem 0.7rem;
            border-radius: 999px;
            background: var(--blue-soft);
            color: var(--blue-strong);
            font-size: 0.7rem;
            font-weight: 700;
            white-space: nowrap;
          }

          .segmented {
            display: inline-flex;
            gap: 0.25rem;
            padding: 0.25rem;
            border: 1px solid var(--line);
            border-radius: 0.85rem;
            background: var(--soft);
          }

          .segment {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 0.9rem;
            border: none;
            border-radius: 0.65rem;
            background: transparent;
            color: var(--muted);
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s ease;
          }

          .segment:hover {
            color: var(--ink);
          }

          .segment-active {
            background: var(--panel);
            color: var(--ink);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
          }

          .settings-switch {
            position: relative;
            flex-shrink: 0;
            width: 2.75rem;
            height: 1.5rem;
            border: none;
            border-radius: 999px;
            background: var(--thumb);
            transition: background-color 0.2s ease;
          }

          .settings-switch-on {
            background: var(--blue);
          }

          .settings-switch-thumb {
            position: absolute;
            top: 0.25rem;
            width: 1rem;
            height: 1rem;
            border-radius: 999px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
            transition: transform 0.2s ease;
          }

          .settings-thumb-on {
            transform: translateX(1.5rem);
          }

          .settings-thumb-off {
            transform: translateX(0.25rem);
          }

          .settings-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--muted);
            margin-bottom: 0.5rem;
          }

          .settings-input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: var(--ink);
            font-size: 0.875rem;
            padding: 0.65rem 0;
          }

          .settings-input::placeholder {
            color: var(--muted);
          }

          .settings-input-simple {
            width: 100%;
            min-height: 44px;
            padding: 0.65rem 0.8rem;
            border: 1px solid var(--line);
            border-radius: 0.625rem;
            background: var(--soft);
            color: var(--ink);
            font-size: 0.875rem;
            outline: none;
            transition: all 0.2s ease;
          }

          .settings-input-simple:focus {
            border-color: var(--blue);
            box-shadow: 0 0 0 3px rgba(45, 122, 155, 0.15);
          }

          .settings-input-readonly {
            color: var(--muted);
            cursor: not-allowed;
          }

          .input-wrapper {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            min-height: 44px;
            padding: 0 0.8rem;
            border: 1px solid var(--line);
            border-radius: 0.625rem;
            background: var(--soft);
            color: var(--muted);
            transition: all 0.2s ease;
          }

          .input-wrapper:focus-within {
            border-color: var(--blue);
            box-shadow: 0 0 0 3px rgba(45, 122, 155, 0.15);
          }

          .textarea-wrapper {
            display: flex;
            align-items: flex-start;
            gap: 0.65rem;
            padding: 0.75rem 0.8rem;
            border: 1px solid var(--line);
            border-radius: 0.625rem;
            background: var(--soft);
            color: var(--muted);
            transition: all 0.2s ease;
          }

          .textarea-wrapper:focus-within {
            border-color: var(--blue);
            box-shadow: 0 0 0 3px rgba(45, 122, 155, 0.15);
          }

          .settings-textarea {
            width: 100%;
            border: none;
            outline: none;
            resize: vertical;
            min-height: 70px;
            background: transparent;
            color: var(--ink);
            font-size: 0.875rem;
          }

          .settings-textarea::placeholder {
            color: var(--muted);
          }

          .password-wrapper {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            min-height: 44px;
            padding: 0 0.8rem;
            border: 1px solid var(--line);
            border-radius: 0.625rem;
            background: var(--soft);
            color: var(--muted);
            transition: all 0.2s ease;
          }

          .password-wrapper:focus-within {
            border-color: var(--blue);
            box-shadow: 0 0 0 3px rgba(45, 122, 155, 0.15);
          }

          .password-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted);
            padding: 0.25rem;
            border: none;
            border-radius: 0.375rem;
            background: transparent;
            transition: 0.2s ease;
          }

          .password-toggle:hover {
            background: var(--panel);
            color: var(--ink);
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
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? 'settings-switch settings-switch-on'
            : 'settings-switch'
        }
      >
        <span
          className={
            checked
              ? 'settings-switch-thumb settings-thumb-on'
              : 'settings-switch-thumb settings-thumb-off'
          }
        />
      </button>
    </div>
  );
};

export default AccountSettings;