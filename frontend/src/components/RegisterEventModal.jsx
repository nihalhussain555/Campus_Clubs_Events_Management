import React, { useState } from 'react';
import { X, Calendar, MapPin, Users } from 'lucide-react';

const RegisterEventModal = ({ event, isOpen, onClose, onConfirm, loading }) => {
  const [formData, setFormData] = useState({
    specialRequirements: '',
    dietaryRestrictions: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">Register for Event</h2>
          <button
            onClick={onClose}
            className="hover:bg-green-700 p-1 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Event Title</label>
            <input
              type="text"
              value={event.title}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <Calendar className="inline mr-2" size={16} />
              Date & Time
            </label>
            <input
              type="text"
              value={formatDate(event.date)}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <MapPin className="inline mr-2" size={16} />
              Location
            </label>
            <input
              type="text"
              value={event.location || 'To be announced'}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <Users className="inline mr-2" size={16} />
              Attendees
            </label>
            <input
              type="text"
              value={`${event.registrations?.length || 0}/${event.capacity || 100}`}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Special Requirements (Optional)</label>
            <textarea
              name="specialRequirements"
              value={formData.specialRequirements}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Accessibility needs, mobility assistance..."
              rows="2"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Dietary Restrictions (Optional)</label>
            <textarea
              name="dietaryRestrictions"
              value={formData.dietaryRestrictions}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Vegetarian, Gluten-free, Vegan..."
              rows="2"
            />
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
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEventModal;
