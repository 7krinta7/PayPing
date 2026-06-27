/**
 * 404 fallback for unmatched routes.
 *
 * Mounted AFTER all routers and BEFORE the error handler so unknown
 * paths return a structured JSON 404 instead of HTML or a stack trace.
 */
const AppError = require("../utils/AppError");

function notFound(req, res, next) {
  next(new AppError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
