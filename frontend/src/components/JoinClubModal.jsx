import React, { useState } from 'react';
import { X } from 'lucide-react';

const JoinClubModal = ({ club, isOpen, onClose, onConfirm, loading }) => {
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      alert('Please agree to join the club');
      return;
    }
    onConfirm();
  };

  if (!isOpen || !club) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">Join Club</h2>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-1 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Club Name</label>
            <input
              type="text"
              value={club.clubName}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Description</label>
            <textarea
              value={club.description}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              rows="4"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Current Members</label>
            <input
              type="text"
              value={`${club.members?.length || 0} members`}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 cursor-pointer"
            />
            <label htmlFor="agree" className="text-sm text-gray-700 cursor-pointer">
              I agree to join this club and follow its rules and guidelines.
            </label>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !agreed}
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-semibold disabled:bg-gray-400"
            >
              {loading ? 'Joining...' : 'Join Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinClubModal;
