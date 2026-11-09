import crypto from 'crypto';

// Alphabets exclude look-alike characters (0/O, 1/l/I) because admins read
// these out to students over chat and phone rather than pasting them.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*?-_=+';

// Length is set so the result already satisfies the password policy with room
// to spare; 14 characters from ~85 symbols is ~10^27 combinations.
const LENGTH = 14;

const pick = (alphabet) => alphabet[crypto.randomInt(alphabet.length)];

const shuffle = (characters) => {
  for (let i = characters.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters;
};

/**
 * Generates a fresh temporary password carrying one character from every
 * required class so it passes the policy on first use.
 */
export const generateTemporaryPassword = () => {
  const required = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];

  const pool = UPPER + LOWER + DIGIT + SYMBOL;
  const characters = [...required];

  for (let i = required.length; i < LENGTH; i += 1) {
    characters.push(pick(pool));
  }

  return shuffle(characters).join('');
};

export const TEMP_PASSWORD_LENGTH = LENGTH;
