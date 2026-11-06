// Strips Mongo operator injection ($gt, $where, dotted keys) from request
// payloads. express-mongo-sanitize is unmaintained and fails against Express
// body/query setters, so the same job is done directly here.
//
// Prunes in place rather than reassigning: req.query is a lazy getter on the
// Express request prototype, and assigning to it throws in strict-mode modules.
const pruneOperators = (target, seen = new Set()) => {
  if (!target || typeof target !== 'object') return;
  if (seen.has(target)) return;
  seen.add(target);

  if (Array.isArray(target)) {
    for (const item of target) pruneOperators(item, seen);
    return;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
      continue;
    }
    pruneOperators(target[key], seen);
  }
};

export const sanitizeRequest = (req, res, next) => {
  pruneOperators(req.body);
  pruneOperators(req.query);
  pruneOperators(req.params);
  next();
};
