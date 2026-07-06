import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { clubAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import JoinClubModal from '../components/JoinClubModal';
import { Plus, Users, Trash2 } from 'lucide-react';

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [joinedClubIds, setJoinedClubIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ clubName: '', description: '' });
  const [selectedClub, setSelectedClub] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningClub, setJoiningClub] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs);

      // Get user's joined clubs
      const userProfile = JSON.parse(localStorage.getItem('user') || '{}');
      if (userProfile.joinedClubs) {
        setJoinedClubIds(userProfile.joinedClubs.map(club => 
          typeof club === 'string' ? club : club._id
        ));
      }
      setLoading(false);
    } catch (error) {
      setToast({ message: 'Error loading clubs', type: 'error' });
      setLoading(false);
    }
  };

  const handleJoinClubClick = (club) => {
    setSelectedClub(club);
    setShowJoinModal(true);
  };

  const handleConfirmJoin = async () => {
    if (!selectedClub) return;
    
    setJoiningClub(true);
    try {
      await clubAPI.joinClub(selectedClub._id);
      setJoinedClubIds([...joinedClubIds, selectedClub._id]);
      setToast({ message: 'Successfully joined club!', type: 'success' });
      setShowJoinModal(false);
      setSelectedClub(null);
      fetchClubs();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error joining club', type: 'error' });
    } finally {
      setJoiningClub(false);
    }
  };

  const handleLeaveClub = async (clubId) => {
    try {
      await clubAPI.leaveClub(clubId);
      setJoinedClubIds(joinedClubIds.filter(id => id !== clubId));
      setToast({ message: 'Successfully left club!', type: 'success' });
      fetchClubs();
    } catch (error) {
      setToast({ message: 'Error leaving club', type: 'error' });
    }
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!formData.clubName || !formData.description) {
      setToast({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    try {
      await clubAPI.createClub(formData);
      setToast({ message: 'Club created successfully!', type: 'success' });
      setFormData({ clubName: '', description: '' });
      setShowForm(false);
      fetchClubs();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error creating club', type: 'error' });
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (window.confirm('Are you sure you want to delete this club?')) {
      try {
        await clubAPI.deleteClub(clubId);
        setToast({ message: 'Club deleted successfully!', type: 'success' });
        fetchClubs();
      } catch (error) {
        setToast({ message: 'Error deleting club', type: 'error' });
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🎯 All Clubs</h1>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} /> Create Club
            </button>
          )}
        </div>

        {showForm && user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Create New Club</h2>
            <form onSubmit={handleCreateClub} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Club Name</label>
                <input
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Coding Club"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Club description"
                  rows="4"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Club
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map(club => (
            <div key={club._id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{club.clubName}</h3>
              <p className="text-gray-600 mb-4">{club.description}</p>
              
              <div className="flex items-center text-gray-600 mb-4">
                <Users size={16} className="mr-2" />
                <span>{club.members?.length || 0} members</span>
              </div>

              <div className="flex gap-2">
                {joinedClubIds.includes(club._id) ? (
                  <button
                    onClick={() => handleLeaveClub(club._id)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold"
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinClubClick(club)}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-semibold"
                  >
                    Join
                  </button>
                )}
                
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteClub(club._id)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {clubs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No clubs available yet</p>
          </div>
        )}
      </div>

      <JoinClubModal 
        club={selectedClub}
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setSelectedClub(null);
        }}
        onConfirm={handleConfirmJoin}
        loading={joiningClub}
      />
    </div>
  );
};

export default Clubs;
