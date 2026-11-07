// <input type="datetime-local"> produces a wall-clock string with no offset,
// e.g. "2026-11-10T14:00". Posted verbatim, the API server re-parses it in
// *its* zone - UTC on Render - and every event lands hours off. Converting to
// a true instant on the client keeps the time the organiser typed regardless
// of where the backend runs.
const pad = (part) => String(part).padStart(2, '0');

export const toInstant = (value) => {
  if (!value) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

// The reverse, for loading a stored event back into a datetime-local input.
export const toInputValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const withInstantTimes = (payload, fields = ['date', 'endDate']) => {
  const next = { ...payload };

  for (const field of fields) {
    if (next[field] !== undefined) {
      next[field] = toInstant(next[field]);
    }
  }

  return next;
};
