import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import LoadingScreen from '../../components/LoadingScreen';
import Toast from '../../components/Toast';
import { authAPI } from '../../services/api';

import ProfileHeader from './components/ProfileHeader';
import InfoSection from './components/InfoSection';
import StatsDashboard from './components/StatsDashboard';
import ClubsSection from './components/ClubsSection';
import EventsSection from './components/EventsSection';
import AdminSection from './components/AdminSection';

import {
  Calendar,
  Activity,
  LogOut
} from 'lucide-react';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

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
    role: 'Student',
    bio: '',
    gender: '',
    dob: '',
    phone: '',
    address: '',
    profilePic: '',
    joinedClubs: [],
    registeredEvents: [],
    createdAt: ''
  });

  // Convert backend role to display role
  const formatRole = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';

      case 'club_leader':
        return 'Club Leader';

      case 'club_member':
        return 'Club Member';

      default:
        return 'Student';
    }
  };

  // Fetch profile from backend
  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const response = await authAPI.getProfile();

      const dbUser = response?.data?.user;

      if (!dbUser) {
        throw new Error('User profile was not returned by the server');
      }

      const formattedUser = {
        name: dbUser.name || '',
        studentId: dbUser.studentId || '',
        email: dbUser.email || '',
        personalEmail: dbUser.personalEmail || '',
        department: dbUser.department || '',
        year: dbUser.year || '',
        semester: dbUser.semester || '',
        course: dbUser.course || '',
        section: dbUser.section || '',
        role: formatRole(dbUser.role),
        bio: dbUser.bio || '',
        gender: dbUser.gender || '',
        dob: dbUser.dob || '',
        phone: dbUser.phone || '',
        address: dbUser.address || '',
        profilePic: dbUser.profilePic || '',
        joinedClubs: Array.isArray(dbUser.joinedClubs)
          ? dbUser.joinedClubs
          : [],
        registeredEvents: Array.isArray(dbUser.registeredEvents)
          ? dbUser.registeredEvents
          : [],
        createdAt: dbUser.createdAt || ''
      };

      setUser(formattedUser);

      // Keep localStorage synchronized
      const storedUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          ...dbUser,
          role: dbUser.role
        })
      );

    } catch (error) {
      console.error('Profile loading error:', error);

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load your profile',
        type: 'error'
      });

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Loading screen
  if (loading) {
    return (
      <LoadingScreen message="Loading profile..." />
    );
  }

  return (
    <div className="app-page min-h-screen bg-slate-50">

      {/* Navbar */}
      <Navbar />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="page-section pt-8 pb-16">

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

          {/* Profile Header */}
          <div className="mb-8">
            <ProfileHeader
              user={user}
              setUser={setUser}
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* =========================================
                LEFT COLUMN
            ========================================= */}
            <div className="space-y-8 lg:col-span-1">

              {/* Personal Information */}
              <InfoSection user={user} />

              {/* Statistics */}
              <StatsDashboard user={user} />

              {/* Upcoming Schedule */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Calendar
                      size={20}
                      className="text-indigo-600"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Upcoming Schedule
                    </h3>

                    <p className="text-xs text-slate-500">
                      Your upcoming activities
                    </p>
                  </div>

                </div>

                <div className="space-y-4">

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                    <div className="flex gap-3">

                      <div className="w-14 shrink-0 text-xs font-bold text-indigo-600">
                        10 AM
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Coding Club Meeting
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Room 402
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                    <div className="flex gap-3">

                      <div className="w-14 shrink-0 text-xs font-bold text-green-600">
                        2 PM
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          AI Workshop
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Main Auditorium
                        </p>
                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Activity
                      size={20}
                      className="text-indigo-600"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Recent Activity
                    </h3>

                    <p className="text-xs text-slate-500">
                      Your latest campus activity
                    </p>
                  </div>

                </div>

                <div className="space-y-5">

                  <div className="flex gap-3">

                    <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />

                    <div>
                      <p className="text-sm text-slate-700">
                        Joined{' '}
                        <span className="font-bold text-slate-900">
                          Robotics Club
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        2 days ago
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-3">

                    <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />

                    <div>
                      <p className="text-sm text-slate-700">
                        Registered for{' '}
                        <span className="font-bold text-slate-900">
                          Hackathon 2026
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        5 days ago
                      </p>
                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* =========================================
                RIGHT COLUMN
            ========================================= */}
            <div className="space-y-8 lg:col-span-2">

              {/* Admin / Club Leader */}
              {(user.role === 'Admin' ||
                user.role === 'Club Leader') && (
                <AdminSection
                  role={user.role}
                />
              )}

              {/* Clubs */}
              <ClubsSection user={user} />

              {/* Events */}
              <EventsSection user={user} />

              {/* Logout */}
              <div className="flex justify-end pt-2">

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  <LogOut size={18} />
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