import React from 'react';
import { Calendar, MapPin, Users, X } from 'lucide-react';

const RegisterEventModal = ({ event, isOpen, onClose, onConfirm, loading }) => {
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = (e) => {
    if (loading) return;
    e.preventDefault();
    onConfirm();
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!isOpen || !event) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <p className="eyebrow mb-2">Event registration</p>
            <h2 className="text-2xl font-black text-black">{event.title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn-secondary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Calendar className="text-[#145f82]" size={18} />
              <span className="text-sm font-bold text-slate-700">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <MapPin className="text-[#145f82]" size={18} />
              <span className="text-sm font-bold text-slate-700">{event.location || 'To be announced'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Users className="text-[#145f82]" size={18} />
              <span className="text-sm font-bold text-slate-700">
                {event.registeredStudents?.length || 0} / {event.capacity || 100} registered
              </span>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            Registering reserves your place and generates a check-in code the
            organiser scans on the day. Certificates are issued once your
            attendance is verified.
          </p>

          <div className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEventModal;
