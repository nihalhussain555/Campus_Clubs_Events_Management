// Audit trail for the account-lifecycle events this feature introduces
// (admin-created accounts, temp password regeneration, mandatory password
// setup, logins that were gated). Records are single-line JSON so Render's
// log viewer keeps them greppable.
//
// Nothing secret may ever be passed here: no passwords, hashes or tokens -
// only identifiers and outcomes.
export const audit = (event, details = {}) => {
  const record = { audit: 'auth', event, at: new Date().toISOString() };

  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null || value === '') continue;
    record[key] = String(value);
  }

  console.info(JSON.stringify(record));
};
