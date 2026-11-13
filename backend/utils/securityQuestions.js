// The recovery flow asks a question from this list and nothing else. Keeping
// the catalogue server-side means a client can never invent a question whose
// answer the account was never asked to give, and an answer hash always
// corresponds to a question the platform actually recognises.
export const SECURITY_QUESTIONS = [
  {
    id: 'first_school',
    label: 'What is the name of the first school you attended?'
  },
  {
    id: 'favourite_teacher',
    label: 'What was the name of your favourite teacher?'
  },
  {
    id: 'childhood_city',
    label: 'In which city were you born?'
  },
  {
    id: 'best_friend',
    label: 'What is the name of your best friend from childhood?'
  },
  {
    id: 'first_pet',
    label: 'What is the name of your first pet?'
  },
  {
    id: 'favorite_book',
    label: 'What is the title of your favourite book?'
  },
  {
    id: 'grandmother_name',
    label: "What is your maternal grandmother's maiden name?"
  },
  {
    id: 'first_phone',
    label: 'What was the model of your first mobile phone?'
  }
];

export const SECURITY_QUESTION_IDS = SECURITY_QUESTIONS.map(
  (question) => question.id
);

// Answers are compared after normalisation, so "New  York " and "new york" are
// the same answer. Requiring a few characters stops someone from choosing a
// question whose answer is a single letter.
export const SECURITY_ANSWER_MIN_LENGTH = 3;

// bcrypt reads the first 72 bytes of a value and ignores the rest, which would
// silently make a long answer match a shorter one. The cap is enforced on the
// normalised answer so the whole thing is always inside the hash.
export const SECURITY_ANSWER_MAX_BYTES = 72;

export const SECURITY_ANSWER_REQUIREMENT_TEXT =
  `The answer must be at least ${SECURITY_ANSWER_MIN_LENGTH} characters ` +
  'and cannot be longer than 72.';

export const isSecurityQuestion = (question) =>
  SECURITY_QUESTION_IDS.includes(question);

export const securityQuestionLabel = (question) =>
  SECURITY_QUESTIONS.find((item) => item.id === question)?.label || null;

export const normalizeSecurityAnswer = (value) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, ' ')
    : '';

// Returns the first problem with an answer, or null when it is usable. Cases
// are kept verbatim for the stored text but the comparison runs on the
// normalised form.
export const securityAnswerFailure = (value) => {
  const answer = normalizeSecurityAnswer(value);

  if (answer.length < SECURITY_ANSWER_MIN_LENGTH) {
    return `The security answer must be at least ${SECURITY_ANSWER_MIN_LENGTH} characters`;
  }

  if (Buffer.byteLength(answer, 'utf8') > SECURITY_ANSWER_MAX_BYTES) {
    return 'The security answer must be 72 bytes or fewer';
  }

  return null;
};
