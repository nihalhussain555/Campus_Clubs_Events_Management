import React, { useEffect, useState } from 'react';
import { Briefcase, Calendar, Shield, Trash2, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import { authAPI, clubAPI, eventAPI, notificationAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [newNotification, setNewNotification] = useState({ title: '', message: '', type: 'info' });

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dashboard') {
        const [usersRes, clubsRes, eventsRes] = await Promise.all([
          authAPI.getAllUsers(),
          clubAPI.getAllClubs(),
          eventAPI.getAllEvents(),
        ]);
        setUsers(usersRes.data.users || []);
        setClubs(clubsRes.data.clubs || []);
        setEvents(eventsRes.data.events || []);
      } else if (activeTab === 'clubs') {
        const clubsRes = await clubAPI.getAllClubs();
        setClubs(clubsRes.data.clubs || []);
      } else if (activeTab === 'events') {
        const eventsRes = await eventAPI.getAllEvents();
        setEvents(eventsRes.data.events || []);
      } else if (activeTab === 'users') {
        const usersRes = await authAPI.getAllUsers();
        setUsers(usersRes.data.users || []);
      } else if (activeTab === 'notifications') {
        const notificationsRes = await notificationAPI.getAllNotifications();
        setNotifications(notificationsRes.data.notifications || []);
      }
    } catch (error) {
      setToast({ message: 'Error loading data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm('Delete this club?')) return;
    try {
      await clubAPI.deleteClub(clubId);
      setToast({ message: 'Club deleted', type: 'success' });
      fetchAdminData();
    } catch (error) {
      setToast({ message: 'Error deleting club', type: 'error' });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await eventAPI.deleteEvent(eventId);
      setToast({ message: 'Event deleted', type: 'success' });
      fetchAdminData();
    } catch (error) {
      setToast({ message: 'Error deleting event', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner message="Loading admin panel..." />;

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      await notificationAPI.createNotification(newNotification);
      setToast({ message: 'Notification created successfully', type: 'success' });
      setNewNotification({ title: '', message: '', type: 'info' });
      fetchAdminData();
    } catch (error) {
      setToast({ message: 'Error creating notification', type: 'error' });
    }
  };

  const tabs = ['dashboard', 'users', 'clubs', 'events', 'notifications'];

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="page-section pt-8">
        <div className="page-container">
          <div className="mb-8">
            <span className="eyebrow">Administration</span>
            <h1 className="display-title text-4xl sm:text-5xl">Admin panel</h1>
            <p className="section-copy mt-4">Monitor users, clubs, events, and platform activity.</p>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto rounded-full border border-slate-200 bg-white p-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-black capitalize transition ${
                  activeTab === tab ? 'bg-black text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Total users', users.length, Users],
                ['Total clubs', clubs.length, Briefcase],
                ['Total events', events.length, Calendar],
                ['Admins', users.filter((u) => u.role === 'admin').length, Shield],
              ].map(([label, value, Icon]) => (
                <article key={label} className="metric-card flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-3 text-4xl font-black text-black">{value}</p>
                  </div>
                  <span className="icon-tile">
                    <Icon size={22} />
                  </span>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="table-shell">
              <table className="w-full min-w-[720px]">
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Name</th>
                    <th className="table-cell">Email</th>
                    <th className="table-cell">Role</th>
                    <th className="table-cell">Clubs</th>
                    <th className="table-cell">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="table-cell font-bold text-black">{item.name}</td>
                      <td className="table-cell">{item.email}</td>
                      <td className="table-cell"><span className="chip capitalize">{item.role}</span></td>
                      <td className="table-cell">{item.joinedClubs?.length || 0}</td>
                      <td className="table-cell">{item.registeredEvents?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'clubs' && (
            <div className="grid gap-5 md:grid-cols-2">
              {clubs.map((club) => (
                <article key={club._id} className="app-card app-card-hover">
                  <h3 className="text-xl font-black text-black">{club.clubName}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{club.description}</p>
                  <div className="my-5 flex flex-wrap gap-2">
                    <span className="chip">{club.members?.length || 0} members</span>
                    <span className="chip">Admin: {club.admin?.name || 'Unknown'}</span>
                  </div>
                  <button type="button" onClick={() => handleDeleteClub(club._id)} className="btn-danger w-full">
                    <Trash2 size={17} />
                    Delete club
                  </button>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="table-shell">
              <table className="w-full min-w-[760px]">
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Title</th>
                    <th className="table-cell">Date</th>
                    <th className="table-cell">Registrations</th>
                    <th className="table-cell">Status</th>
                    <th className="table-cell">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <tr key={event._id} className="hover:bg-slate-50">
                      <td className="table-cell font-bold text-black">{event.title}</td>
                      <td className="table-cell">{new Date(event.date).toLocaleDateString()}</td>
                      <td className="table-cell">{event.registeredStudents?.length || 0} / {event.capacity}</td>
                      <td className="table-cell"><span className="chip capitalize">{event.status}</span></td>
                      <td className="table-cell">
                        <button type="button" onClick={() => handleDeleteEvent(event._id)} className="btn-danger px-3" aria-label={`Delete ${event.title}`}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="app-card">
                <h2 className="text-2xl font-black text-black mb-6">Create Notification</h2>
                <form onSubmit={handleCreateNotification} className="flex flex-col gap-5">
                  <div className="form-group">
                    <label htmlFor="title" className="form-label">Title</label>
                    <input
                      id="title"
                      type="text"
                      required
                      className="form-input"
                      value={newNotification.title}
                      onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                      placeholder="E.g., System Maintenance"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="type" className="form-label">Type</label>
                    <select
                      id="type"
                      className="form-input"
                      value={newNotification.type}
                      onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                    >
                      <option value="info">Info</option>
                      <option value="alert">Alert</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="message" className="form-label">Message</label>
                    <textarea
                      id="message"
                      required
                      className="form-input min-h-[100px] resize-y"
                      value={newNotification.message}
                      onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                      placeholder="Message content..."
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full">Broadcast Notification</button>
                </form>
              </div>

              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-black text-black mb-2">Past Notifications</h2>
                {notifications.length === 0 ? (
                  <p className="text-slate-500">No notifications yet.</p>
                ) : (
                  notifications.map(notif => (
                    <article key={notif._id} className="app-card">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-black">{notif.title}</h3>
                        <span className="chip capitalize text-xs">{notif.type}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{notif.message}</p>
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
