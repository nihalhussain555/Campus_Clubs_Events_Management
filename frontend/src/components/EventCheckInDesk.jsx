import React, { useState } from 'react';
import { ScanLine } from 'lucide-react';

import { eventAPI } from '../services/api';

// Organiser side of the QR check-in flow: paste (or type) the code a student
// shows and record verified attendance. Reused by Events and the leader desk.
const EventCheckInDesk = ({ event, onVerified, onNotify }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const token = code.trim();

    if (!token) {
      onNotify({
        message: 'Scan or paste the student check-in code first',
        type: 'error'
      });

      return;
    }

    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const response = await eventAPI.checkIn(event._id, token);

      onNotify({
        message:
          response.message || 'Attendance recorded',
        type: 'success'
      });

      setCode('');

      await onVerified();
    } catch (error) {
      onNotify({
        message:
          error.response?.data?.message ||
          error.message ||
          'Unable to record attendance',
        type: 'error'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        <ScanLine size={15} className="text-[#145f82]" />
        Verify a student check-in code
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          className="field flex-1"
          placeholder="Paste the code from the scanned QR"
          aria-label={`Check-in code for ${event.title}`}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="btn-success shrink-0"
        >
          {busy ? 'Verifying...' : 'Check in'}
        </button>

      </div>

    </div>
  );
};

export default EventCheckInDesk;
