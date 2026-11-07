import React from 'react';
import { CalendarPlus, ExternalLink } from 'lucide-react';

import { downloadIcs, googleCalendarUrl } from '../utils/calendar';

// The button saves an .ics locally; the link hands Google the same details.
// Neither one signs the student into anything or leaves a token behind.
const AddToCalendar = ({ event, onNotify }) => {
  if (!event?.date) {
    return null;
  }

  const google = googleCalendarUrl(event);

  const handleDownload = () => {
    const saved = downloadIcs(event);

    onNotify?.({
      message: saved
        ? 'Calendar file downloaded - open it to add the event'
        : 'This event has no date to add',
      type: saved ? 'success' : 'error'
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">

      <button
        type="button"
        onClick={handleDownload}
        className="btn-soft inline-flex items-center gap-2 px-3 py-2 text-xs"
        aria-label={`Add ${event.title} to your calendar`}
      >
        <CalendarPlus size={15} />
        Add to calendar
      </button>

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
  );
};

export default AddToCalendar;
