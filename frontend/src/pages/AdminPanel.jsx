import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { authAPI, clubAPI, eventAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { Users, Briefcase, Calendar, Edit2, Trash2 } from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingClub, setEditingClub] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dashboard') {
        const [usersRes, clubsRes, eventsRes] = await Promise.all([
          authAPI.getAllUsers(),
          clubAPI.getAllClubs(),
          eventAPI.getAllEvents()
        ]);
        setUsers(usersRes.data.users);
        setClubs(clubsRes.data.clubs);
        setEvents(eventsRes.data.events);
      } else if (activeTab === 'clubs') {
        const clubsRes = await clubAPI.getAllClubs();
        setClubs(clubsRes.data.clubs);
      } else if (activeTab === 'events') {
        const eventsRes = await eventAPI.getAllEvents();
        setEvents(eventsRes.data.events);
      } else if (activeTab === 'users') {
        const usersRes = await authAPI.getAllUsers();
        setUsers(usersRes.data.users);
      }
      setLoading(false);
    } catch (error) {
      setToast({ message: 'Error loading data', type: 'error' });
      setLoading(false);
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (window.confirm('Delete this club?')) {
      try {
        await clubAPI.deleteClub(clubId);
        setToast({ message: 'Club deleted', type: 'success' });
        fetchAdminData();
      } catch (error) {
        setToast({ message: 'Error deleting club', type: 'error' });
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Delete this event?')) {
      try {
        await eventAPI.deleteEvent(eventId);
        setToast({ message: 'Event deleted', type: 'success' });
        fetchAdminData();
      } catch (error) {
        setToast({ message: 'Error deleting event', type: 'error' });
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">⚙️ Admin Panel</h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          {['dashboard', 'users', 'clubs', 'events'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-gray-800">{users.length}</p>
                  </div>
                  <Users size={40} className="text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Clubs</p>
                    <p className="text-3xl font-bold text-gray-800">{clubs.length}</p>
                  </div>
                  <Briefcase size={40} className="text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Events</p>
                    <p className="text-3xl font-bold text-gray-800">{events.length}</p>
                  </div>
                  <Calendar size={40} className="text-purple-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Admins</p>
                    <p className="text-3xl font-bold text-gray-800">{users.filter(u => u.role === 'admin').length}</p>
                  </div>
                  <Users size={40} className="text-red-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Name</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Email</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Role</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Clubs</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Events</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3">{user.name}</td>
                    <td className="px-6 py-3">{user.email}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">{user.joinedClubs?.length || 0}</td>
                    <td className="px-6 py-3">{user.registeredEvents?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Clubs Tab */}
        {activeTab === 'clubs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clubs.map(club => (
              <div key={club._id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{club.clubName}</h3>
                <p className="text-gray-600 mb-4">{club.description}</p>
                <div className="mb-4">
                  <p className="text-gray-700"><span className="font-semibold">Members:</span> {club.members?.length || 0}</p>
                  <p className="text-gray-700"><span className="font-semibold">Admin:</span> {club.admin?.name || 'Unknown'}</p>
                </div>
                <button
                  onClick={() => handleDeleteClub(club._id)}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Delete Club
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Title</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Registrations</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">{event.title}</td>
                    <td className="px-6 py-3">{new Date(event.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3">{event.registeredStudents?.length || 0} / {event.capacity}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
