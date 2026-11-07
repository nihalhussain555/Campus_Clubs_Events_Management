// Mirrors the XP rates published by the backend (backend/config/xpRules.js) so
// an organiser can see what a verified check-in will pay before creating the
// event. The server stays the authority; this only labels the choice.
export const ACTIVITY_OPTIONS = [
  { value: 'event', label: 'Event', xp: 10 },
  { value: 'competition', label: 'Competition', xp: 20 },
  { value: 'workshop', label: 'Workshop', xp: 15 },
  { value: 'volunteering', label: 'Volunteering', xp: 20 }
];

const optionFor = (value) =>
  ACTIVITY_OPTIONS.find((option) => option.value === value);

export const activityLabel = (value) =>
  optionFor(value)?.label || 'Event';

export const activityXp = (value) => optionFor(value)?.xp || 10;
