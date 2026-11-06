// One definition of "what is this event doing right now", shared by the list,
// calendar, profile and both dashboards so they can never disagree. It mirrors
// the backend's getCurrentStatus: a cancelled flag wins, otherwise the start
// and end times decide, so an event still inside its window is never shown as
// finished just because it already started.
export const getEventStatus = (event, now = new Date()) => {
  if (!event) return 'upcoming';

  if (String(event.status || '').toLowerCase() === 'cancelled') {
    return 'cancelled';
  }

  const start = new Date(event.date);
  const end = new Date(event.endDate || event.date);

  if (Number.isNaN(start.getTime())) return 'upcoming';
  if (start > now) return 'upcoming';
  if (end >= now) return 'ongoing';

  return 'completed';
};

export const EVENT_STATUS_LABELS = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const statusLabel = (event, now) =>
  EVENT_STATUS_LABELS[getEventStatus(event, now)];
