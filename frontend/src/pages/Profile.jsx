import React, { useEffect, useState } from 'react';
import { Calendar, Edit2, Lock, Mail, Save, Shield, User, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { authAPI } from '../services/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
      setEditFormData({ name: response.data.user.name, email: response.data.user.email });
    } catch (error) {
      setToast({ message: 'Error loading profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSaveProfile = () => {
    if (!editFormData.name.trim() || !editFormData.email.trim()) {
      setToast({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    const updatedUser = { ...user, name: editFormData.name.trim(), email: editFormData.email.trim() };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setToast({ message: 'Profile updated successfully', type: 'success' });
    setIsEditingProfile(false);
  };

  const handleChangePassword = () => {
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

    setToast({ message: 'Password changed successfully', type: 'success' });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsChangingPassword(false);
  };

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="page-section pt-8">
        <div className="page-container max-w-6xl">
          <section className="mb-8 rounded-[2rem] bg-black p-7 text-white shadow-[0_28px_80px_rgba(0,0,0,0.18)] sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-white/50">Profile</p>
                <h1 className="text-4xl font-black leading-tight sm:text-5xl">{user?.name}</h1>
                <p className="mt-3 flex items-center gap-2 text-white/70">
                  <Mail size={18} />
                  {user?.email}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4">
                <Shield size={22} />
                <span className="font-black capitalize">{user?.role === 'admin' ? 'Administrator' : 'Student'}</span>
              </div>
            </div>
          </section>

          <div className="mb-8 grid gap-5 md:grid-cols-3">
            {[
              ['Joined clubs', user?.joinedClubs?.length || 0],
              ['Registered events', user?.registeredEvents?.length || 0],
              ['Account type', user?.role || 'student'],
            ].map(([label, value]) => (
              <div key={label} className="metric-card">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-black capitalize text-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <section className="app-card">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-black text-black">Personal information</h2>
                {!isEditingProfile && (
                  <button type="button" onClick={() => setIsEditingProfile(true)} className="btn-secondary">
                    <Edit2 size={17} />
                    Edit
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form className="space-y-5">
                  <div>
                    <label className="field-label">Full name</label>
                    <input name="name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="field" />
                  </div>
                  <div>
                    <label className="field-label">Email address</label>
                    <input name="email" type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className="field" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={handleSaveProfile} className="btn-primary">
                      <Save size={17} />
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditFormData({ name: user.name, email: user.email });
                      }}
                      className="btn-secondary"
                    >
                      <X size={17} />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4">
                  {[
                    [User, 'Full name', user?.name],
                    [Mail, 'Email address', user?.email],
                    [Shield, 'Account role', user?.role === 'admin' ? 'Administrator' : 'Student'],
                    [Calendar, 'Member since', new Date().toLocaleDateString()],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4">
                      <span className="icon-tile">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                        <p className="mt-1 font-bold text-slate-800">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="app-card">
              <h2 className="mb-6 text-2xl font-black text-black">Security</h2>
              {isChangingPassword ? (
                <form className="space-y-4">
                  {[
                    ['currentPassword', 'Current password'],
                    ['newPassword', 'New password'],
                    ['confirmPassword', 'Confirm new password'],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className="field-label">{label}</label>
                      <input
                        type="password"
                        name={name}
                        value={passwordData[name]}
                        onChange={(e) => setPasswordData({ ...passwordData, [name]: e.target.value })}
                        className="field"
                      />
                    </div>
                  ))}
                  <div className="grid gap-3">
                    <button type="button" onClick={handleChangePassword} className="btn-primary">
                      <Save size={17} />
                      Save password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setIsChangingPassword(true)} className="btn-secondary w-full">
                  <Lock size={17} />
                  Change password
                </button>
              )}
            </section>
          </div>

          {user?.joinedClubs?.length > 0 && (
            <section className="mt-8 app-card">
              <h2 className="mb-5 text-2xl font-black text-black">My clubs ({user.joinedClubs.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {user.joinedClubs.map((club, idx) => (
                  <article key={club._id || idx} className="soft-panel">
                    <h3 className="font-black text-black">{club.clubName}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{club.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {user?.registeredEvents?.length > 0 && (
            <section className="mt-8 app-card">
              <h2 className="mb-5 text-2xl font-black text-black">My events ({user.registeredEvents.length})</h2>
              <div className="grid gap-4">
                {user.registeredEvents.map((event, idx) => (
                  <article key={event._id || idx} className="soft-panel">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black text-black">{event.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
                        <p className="mt-2 text-sm font-bold text-slate-500">{new Date(event.date).toLocaleString()}</p>
                      </div>
                      <span className="chip capitalize">{event.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
