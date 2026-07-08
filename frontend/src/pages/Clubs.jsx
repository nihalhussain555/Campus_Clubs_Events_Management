import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import { clubAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import JoinClubModal from '../components/JoinClubModal';

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

  const fetchClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.clubs || []);
      const userProfile = JSON.parse(localStorage.getItem('user') || '{}');
      setJoinedClubIds((userProfile.joinedClubs || []).map((club) => (typeof club === 'string' ? club : club._id)));
    } catch (error) {
      setToast({ message: 'Error loading clubs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleConfirmJoin = async () => {
    if (!selectedClub) return;

    setJoiningClub(true);
    try {
      await clubAPI.joinClub(selectedClub._id);
      setJoinedClubIds((ids) => [...ids, selectedClub._id]);
      setToast({ message: 'Successfully joined club', type: 'success' });
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
      setJoinedClubIds((ids) => ids.filter((id) => id !== clubId));
      setToast({ message: 'Successfully left club', type: 'success' });
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
      setToast({ message: 'Club created successfully', type: 'success' });
      setFormData({ clubName: '', description: '' });
      setShowForm(false);
      fetchClubs();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error creating club', type: 'error' });
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm('Are you sure you want to delete this club?')) return;
    try {
      await clubAPI.deleteClub(clubId);
      setToast({ message: 'Club deleted successfully', type: 'success' });
      fetchClubs();
    } catch (error) {
      setToast({ message: 'Error deleting club', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner message="Loading clubs..." />;

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="page-section pt-8">
        <div className="page-container">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Student communities</span>
              <h1 className="display-title text-4xl sm:text-5xl">All clubs</h1>
              <p className="section-copy mt-4">Browse active campus communities and manage your memberships.</p>
            </div>
            {user?.role === 'admin' && (
              <button type="button" onClick={() => setShowForm((open) => !open)} className="btn-primary">
                <Plus size={18} />
                Create club
              </button>
            )}
          </div>

          {showForm && user?.role === 'admin' && (
            <form onSubmit={handleCreateClub} className="app-card mb-8 space-y-5">
              <h2 className="text-2xl font-black text-black">Create new club</h2>
              <div>
                <label className="field-label">Club name</label>
                <input
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  className="field"
                  placeholder="Coding Club"
                />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="field min-h-28"
                  placeholder="Describe the club purpose and activities"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className="btn-primary">Create club</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          )}

          {clubs.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => {
                const joined = joinedClubIds.includes(club._id);
                return (
                  <article key={club._id} className="app-card app-card-hover flex min-h-72 flex-col">
                    <div className="mb-5 flex h-24 items-center justify-center rounded-2xl bg-[#e8f5fb] text-4xl font-black text-[#145f82]">
                      {club.clubName?.charAt(0) || 'C'}
                    </div>
                    <h3 className="mb-2 text-xl font-black text-black">{club.clubName}</h3>
                    <p className="mb-5 flex-1 text-sm leading-6 text-slate-600">{club.description}</p>
                    <div className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Users size={17} className="text-[#145f82]" />
                      {club.members?.length || 0} members
                    </div>
                    <div className="flex gap-2">
                      {joined ? (
                        <button type="button" onClick={() => handleLeaveClub(club._id)} className="btn-danger flex-1">
                          Leave
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClub(club);
                            setShowJoinModal(true);
                          }}
                          className="btn-primary flex-1"
                        >
                          Join
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button type="button" onClick={() => handleDeleteClub(club._id)} className="btn-secondary px-3" aria-label={`Delete ${club.clubName}`}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="app-card text-center">
              <p className="text-lg font-bold text-slate-500">No clubs available yet.</p>
            </div>
          )}
        </div>
      </main>

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
