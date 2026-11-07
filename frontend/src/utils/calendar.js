// Calendar export happens entirely in the browser: the event is already on the
// page, so nothing about the student leaves their device and there is no
// server round-trip.

// RFC 5545 requires \, \; and \\ escaping and CRLF line breaks.
const escapeText = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// "20261110T090000Z" - the form both the .ics fields and Google's dates=
// parameter want. Always UTC so an export never drifts with the viewer.
const stamp = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

// Lines longer than 75 octets must be folded, with continuation lines starting
// with a space. Outlook rejects unfolded files outright.
const fold = (line) => {
  if (line.length <= 75) {
    return line;
  }

  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);

  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }

  parts.push(` ${rest}`);

  return parts.join('\r\n');
};

export const buildIcs = (event) => {
  const start = stamp(event?.date);

  if (!start) {
    return null;
  }

  const end = stamp(event?.endDate) || start;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Clubs//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event._id}@campus-clubs`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(event.title || 'Campus event')}`,
    `LOCATION:${escapeText(event.location || 'To be announced')}`,
    `DESCRIPTION:${escapeText(event.description || '')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .map(fold)
    .join('\r\n');
};

const fileBase = (title = 'event') =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'event';

export const downloadIcs = (event) => {
  const text = buildIcs(event);

  if (!text) {
    return false;
  }

  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/calendar;charset=utf-8' })
  );

  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileBase(event.title)}.ics`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  return true;
};

// Opens Google Calendar's own compose dialog. The student is sent to Google,
// not logged into anything, so no token or profile data travels.
export const googleCalendarUrl = (event) => {
  const start = stamp(event?.date);

  if (!start) {
    return null;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Campus event',
    dates: `${start}/${stamp(event?.endDate) || start}`,
    details: event.description || '',
    location: event.location || ''
  });

  return `https://calendar.google.com/calendar/render?${params}`;
};
