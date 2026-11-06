import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { AlertTriangle, Copy, Loader2, QrCode, X } from 'lucide-react';

import { eventAPI } from '../services/api';

// The student shows this to the event organiser, who scans it (or types the
// short code) to record verified attendance.
const CheckInTicketModal = ({ event, onClose }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!event?._id) {
      return;
    }

    let active = true;

    const loadToken = async () => {
      setLoading(true);
      setError('');
      setCopied(false);

      try {
        const response = await eventAPI.getCheckinToken(event._id);

        if (!active) {
          return;
        }

        if (response.data?.token) {
          setToken(response.data.token);
        } else {
          setError('No check-in code was returned for this event.');
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            'Unable to load your check-in code.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadToken();

    return () => {
      active = false;
    };
  }, [event?._id]);

  if (!event) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Check-in code for ${event.title}`}
    >
      <div className="modal-card max-w-md">

        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <p className="eyebrow mb-2">Event check-in</p>
            <h2 className="text-xl font-black text-black">
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">

          {loading && (
            <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Creating your check-in code...
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm font-bold leading-6 text-amber-800">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && token && (
            <>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <QRCodeCanvas
                  value={token}
                  size={208}
                  level="M"
                  marginSize={2}
                />


                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <QrCode size={18} className="text-[#145f82]" />
                  Show this to the event organiser
                </div>
              </div>

              <div>
                <label className="field-label">
                  Or share this code
                </label>

                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={token}
                    rows={3}
                    className="field min-h-0 break-all font-mono text-xs"
                    aria-label="Check-in code"
                  />

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-secondary shrink-0 px-3"
                    aria-label="Copy check-in code"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                {copied && (
                  <p className="mt-2 text-xs font-bold text-[#145f82]">
                    Code copied
                  </p>
                )}
              </div>

              <p className="text-xs leading-5 text-slate-500">
                This code expires a few hours after it is created and works for
                this event only. Attendance is recorded once the organiser
                verifies it.
              </p>
            </>
          )}

          <div className="border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckInTicketModal;
