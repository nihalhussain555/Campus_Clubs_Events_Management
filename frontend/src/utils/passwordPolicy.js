// Mirrors backend/utils/passwordPolicy.js. Kept in one place so the signup
// form, the account settings form and the mandatory setup page all promise the
// same thing the server enforces.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (value) => /[A-Z]/.test(value)
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (value) => /[a-z]/.test(value)
  },
  {
    id: 'number',
    label: 'One number',
    test: (value) => /[0-9]/.test(value)
  },
  {
    id: 'special',
    label: 'One special character',
    test: (value) => /[^A-Za-z0-9]/.test(value)
  }
];

export const PASSWORD_REQUIREMENT_TEXT =
  `Use at least ${PASSWORD_MIN_LENGTH} characters with an uppercase letter, ` +
  'a lowercase letter, a number and a special character';

export const passwordFailures = (value = '') => {
  if (typeof value !== 'string' || value.length === 0) {
    return PASSWORD_RULES.map((rule) => rule.label);
  }

  const failures = PASSWORD_RULES
    .filter((rule) => !rule.test(value))
    .map((rule) => rule.label);

  if (value.length > PASSWORD_MAX_LENGTH) {
    failures.push(`No more than ${PASSWORD_MAX_LENGTH} characters`);
  }

  return failures;
};

export const meetsPasswordPolicy = (value) =>
  passwordFailures(value).length === 0;

const GRADES = [
  { color: '#b42318', label: 'Too weak' },
  { color: '#b42318', label: 'Weak' },
  { color: '#d97706', label: 'Fair' },
  { color: '#ca8a04', label: 'Good' },
  { color: '#157f5b', label: 'Strong' },
  { color: '#157f5b', label: 'Meets every requirement' }
];

// Score is the count of satisfied rules, so the meter and the checklist can
// never disagree with each other or with the submit button.
export const passwordStrength = (value) => {
  if (!value) {
    return {
      score: 0,
      percent: 0,
      color: 'var(--muted)',
      label: 'Enter a password',
      meetsPolicy: false
    };
  }

  const score = PASSWORD_RULES.filter((rule) => rule.test(value)).length;

  return {
    score,
    percent: (score / PASSWORD_RULES.length) * 100,
    ...GRADES[score],
    meetsPolicy: score === PASSWORD_RULES.length &&
      value.length <= PASSWORD_MAX_LENGTH
  };
};
