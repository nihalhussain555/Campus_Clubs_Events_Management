import React, { useState } from 'react';
import {
  CalendarCheck,
  CalendarPlus,
  Download,
  ExternalLink
} from 'lucide-react';

import {
  downloadIcs,
  googleCalendarUrl
} from '../utils/calendar';
import {
  removeEventFromCalendar,
  saveEventToCalendar,
  useMyCalendar
} from '../hooks/useMyCalendar';

// The main action now stores the event on the site calendar, which is what
// makes it appear on the calendar page and earn the pre-start notification.
// The .ics file and the Google link stay underneath for anyone who wants the
// event on a device outside the app.
const AddToCalendar = ({ event, onNotify }) => {
  const { isSaved } = useMyCalendar();
  const [busy, setBusy] = useState(false);

  if (!event?._id) {
    return null;
  }

  const saved = isSaved(event._id);
  const google = googleCalendarUrl(event);

  const toggle = async () => {
    setBusy(true);

    try {
      const result = saved
        ? await removeEventFromCalendar(event._id)
        : await saveEventToCalendar(event._id);

      onNotify?.({
        message: result.message,
        type: 'success'
      });
    } catch (error) {
      onNotify?.({
        message:
          error.response?.data?.message ||
          'Could not change your calendar',
        type: 'error'
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    const fileSaved = event.date
      ? downloadIcs(event)
      : false;

    onNotify?.({
      message: fileSaved
        ? 'Calendar file downloaded - open it to add the event'
        : 'This event has no date to add',
      type: fileSaved ? 'success' : 'error'
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">

      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        className={
          saved
            ? 'btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs'
            : 'btn-soft inline-flex items-center gap-2 px-3 py-2 text-xs'
        }
        aria-label={
          saved
            ? `Remove ${event.title} from my calendar`
            : `Add ${event.title} to my calendar`
        }
      >
        {saved ? <CalendarCheck size={15} /> : <CalendarPlus size={15} />}
        {busy
          ? 'Saving...'
          : saved
            ? 'In my calendar'
            : 'Add to my calendar'}
      </button>

      <div className="flex items-center gap-3">

        {event.date && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#145f82] hover:underline"
          >
            <Download size={14} />
            .ics
          </button>
        )}

        {google && (
          <a
            href={google}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#145f82] hover:underline"
          >
            <ExternalLink size={14} />
            Google
          </a>
        )}

      </div>

    </div>
  );
};

export default AddToCalendar;
