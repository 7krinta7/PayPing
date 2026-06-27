/**
 * Rate limiters.
 *
 * Three buckets, each backed by express-rate-limit's default in-memory
 * store (suitable for a single-process deploy; for a horizontally
 * scaled deploy, swap to the `rate-limit-redis` store — the public API
 * is unchanged).
 *
 *   authLimiter      — 10 req / 15 min / IP on /api/auth/*
 *                      Mitigates credential stuffing on login + register.
 *   passwordLimiter  — 5 req / 15 min / IP on PATCH /api/user/password
 *                      Mitigates brute-forcing the current-password check.
 *   generalLimiter   — 300 req / min / IP on all /api/*
 *                      Defensive ceiling; stops misbehaving clients from
 *                      monopolising the process.
 *
 * Each limiter responds with 429 + a `Retry-After` header and a JSON
 * `{ message }` body, matching the rest of the API error envelope.
 */

const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

function buildLimiter({
  windowMs,
  max,
  name,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      logger.warn("rate limit exceeded", {
        limiter: name,
        ip: req.ip,
        path: req.originalUrl,
        retryAfterSec: Math.ceil(options.windowMs / 1000),
      });

      res.status(options.statusCode).json({
        message: "Too many requests, please try again later.",
      });
    },
  });
}

const authLimiter = buildLimiter({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  skipSuccessfulRequests: true,
});

const passwordLimiter = buildLimiter({
  name: "password",
  windowMs: 15 * 60 * 1000,
  max: 5,
});

const generalLimiter = buildLimiter({
  name: "general",
  windowMs: 60 * 1000,
  max: 300,
});

module.exports = {
  authLimiter,
  passwordLimiter,
  generalLimiter,
};
