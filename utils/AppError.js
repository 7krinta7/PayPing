/**
 * AppError — typed error class for HTTP failures.
 *
 * Throw it inside route handlers / services and the centralised
 * error handler will translate `status` into the HTTP response code.
 * Anything not an AppError is treated as an internal 500.
 */
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

module.exports = AppError;
