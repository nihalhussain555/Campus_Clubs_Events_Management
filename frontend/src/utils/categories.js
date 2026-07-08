export const CATEGORY_OPTIONS = [
  'Sports',
  'Technology',
  'Arts',
  'Culture',
  'Business',
  'Science',
  'Community',
  'Wellness',
  'Academic',
  'General',
];

export const inferCategory = (value = '') => {
  const text = value.toLowerCase();

  if (/(sport|football|soccer|cricket|basketball|tennis|athletic|fitness|game|match|tournament)/.test(text)) {
    return 'Sports';
  }
  if (/(tech|coding|code|robot|software|ai|data|web|programming|developer|computer)/.test(text)) {
    return 'Technology';
  }
  if (/(art|music|dance|design|photo|film|creative|theatre|drama)/.test(text)) {
    return 'Arts';
  }
  if (/(culture|language|literature|heritage|debate|history)/.test(text)) {
    return 'Culture';
  }
  if (/(business|entrepreneur|finance|marketing|startup|management)/.test(text)) {
    return 'Business';
  }
  if (/(science|research|physics|chemistry|biology|math|astronomy)/.test(text)) {
    return 'Science';
  }
  if (/(volunteer|service|social|community|environment|outreach)/.test(text)) {
    return 'Community';
  }
  if (/(health|wellness|yoga|mindfulness|meditation|mental)/.test(text)) {
    return 'Wellness';
  }
  if (/(academic|study|seminar|workshop|lecture|course)/.test(text)) {
    return 'Academic';
  }

  return 'General';
};

export const getClubCategory = (club) =>
  club?.category || inferCategory(`${club?.clubName || ''} ${club?.description || ''}`);

export const getEventCategory = (event) =>
  event?.category || event?.club?.category || inferCategory(`${event?.title || ''} ${event?.description || ''} ${event?.club?.clubName || ''}`);

export const categoryMatches = (itemCategory, selectedCategory) =>
  selectedCategory === 'All' || itemCategory === selectedCategory;
