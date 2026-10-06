// Rate limiters. Abuse protection matters here: the report endpoint is public
// and anonymous, so it is a natural target for spam and flooding.

const rateLimit = require('express-rate-limit');

const jsonMessage = (msg) => ({
  handler: (_req, res) => res.status(429).json({ error: msg }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Broad limiter applied to the whole API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  ...jsonMessage('Too many requests. Please slow down and try again shortly.'),
});

// Strict limiter for creating content (reports, comments).
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  ...jsonMessage('You have submitted too many times in the last hour. Please try again later.'),
});

// Very strict limiter for the upvote endpoint.
const upvoteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  ...jsonMessage('Too many votes. Please try again later.'),
});

module.exports = { apiLimiter, writeLimiter, upvoteLimiter };
