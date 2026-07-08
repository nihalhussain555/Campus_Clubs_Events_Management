import React, { useState } from 'react';
import { Users, X } from 'lucide-react';

const JoinClubModal = ({ club, isOpen, onClose, onConfirm, loading }) => {
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (agreed) onConfirm();
  };

  if (!isOpen || !club) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <p className="eyebrow mb-2">Membership</p>
            <h2 className="text-2xl font-black text-black">Join {club.clubName}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary px-3" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="soft-panel">
            <div className="mb-3 flex items-center gap-3">
              <span className="icon-tile">
                <Users size={20} />
              </span>
              <div>
                <h3 className="font-black text-black">{club.clubName}</h3>
                <p className="text-sm font-semibold text-slate-500">{club.members?.length || 0} members</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">{club.description}</p>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#145f82]"
            />
            <span>I agree to join this club and follow its rules and guidelines.</span>
          </label>

          <div className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <button type="button" onClick={onClose} className="btn-secondary w-full">
              Cancel
            </button>
            <button type="submit" disabled={loading || !agreed} className="btn-primary w-full">
              {loading ? 'Joining...' : 'Join Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinClubModal;
