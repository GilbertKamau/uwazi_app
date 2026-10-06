// Central error handling. Never leak stack traces or internal messages to
// clients in production - those can reveal schema details, file paths, and
// library versions useful to an attacker.

const config = require('../config/env');

const notFound = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // Stack traces for server faults only; 4xx are client mistakes (bad upload etc.).
  const loggedStatus = err.status || err.statusCode || 500;
  // eslint-disable-next-line no-console
  if (loggedStatus >= 500) console.error('[error]', err.stack || err.message || err);

  // Body parser / malformed JSON
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Malformed request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }

  const status = err.status || err.statusCode || 500;
  const body = { error: status === 500 ? 'Something went wrong' : err.message };
  if (!config.isProd && status === 500) {
    body.detail = err.message;
  }
  return res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
