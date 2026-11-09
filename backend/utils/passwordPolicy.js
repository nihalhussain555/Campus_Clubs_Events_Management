// One definition of a usable password, shared by registration, the mandatory
// first-login setup page, the change-password form and the temporary password
// generator. Scattered copies of the rule are how a backend that requires a
// symbol ends up with a frontend that does not mention it.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// bcrypt only reads the first 72 bytes, so a longer entry would silently give
// the user less protection than they typed.
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

// Returns the labels that still fail, so callers can say exactly what is
// missing instead of repeating the whole rulebook.
export const passwordFailures = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return PASSWORD_RULES.map((rule) => rule.label);
  }

  const failures = PASSWORD_RULES.filter((rule) => !rule.test(value)).map(
    (rule) => rule.label
  );

  if (value.length > PASSWORD_MAX_LENGTH) {
    failures.push(`Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`);
  }

  return failures;
};

export const isStrongPassword = (value) =>
  passwordFailures(value).length === 0;

export const PASSWORD_REQUIREMENT_TEXT =
  `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an ` +
  'uppercase letter, a lowercase letter, a number and a special character';
