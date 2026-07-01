/**
 * Centralised error handler.
 *
 * Recognises:
 *   - AppError                   → honours `status` (default 500)
 *   - Mongoose ValidationError   → 400 with `err.message`
 *   - Mongoose CastError         → 400 (malformed id)
 *   - Mongo duplicate key (11000)→ 409
 *   - express.json body too large→ 413
 *   - JWT errors                 → 401
 *   - everything else            → 500
 *
 * Always logs once with a stable request id so a single error can be
 * traced from log → response.
 */

const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

function generateRequestId() {
  // Short, log-friendly id. Not cryptographic — just correlation.
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const requestId = generateRequestId();
  let status = 500;
  let message = "Internal server error";
  let publicBody;

  if (err instanceof AppError) {
    status = err.status || 500;
    message = err.message;
  } else if (err && err.name === "ValidationError") {
    status = 400;
    message = err.message;
  } else if (err && err.name === "CastError") {
    status = 400;
    message = `${err.path || "value"} must be a valid id`;
  } else if (err && err.code === 11000) {
    status = 409;
    // Try to name the field that collided so the client can surface a
    // useful error (e.g. "Invoice number already exists"). The keyValue
    // shape varies across Mongoose versions, so we read defensively.
    let friendlyField = null;
    if (err.keyValue && typeof err.keyValue === "object") {
      const keys = Object.keys(err.keyValue);
      if (keys.length) {
        const k = keys.find((x) => x !== "_id") || keys[0];
        friendlyField = k;
      }
    }
    if (friendlyField === "invoiceNumber") {
      message = "Invoice number already exists";
    } else if (friendlyField) {
      // Capitalise the first character for a generic but field-aware
      // message — e.g. "Email already exists".
      message = `${friendlyField.charAt(0).toUpperCase()}${friendlyField.slice(1)} already exists`;
    } else {
      message = "Resource already exists";
    }
  } else if (err && err.type === "entity.too.large") {
    status = 413;
    message = "Request body too large";
  } else if (err && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")) {
    status = 401;
    message = "Token is not valid";
  } else if (err && err.status && err.status >= 400 && err.status < 600) {
    status = err.status;
    message = err.message || message;
  }

  // Log only once, after we know the final status.
  const logMeta = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    message: err?.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  };
  // 5xx is an actual incident; 4xx is normal client behaviour.
  if (status >= 500) {
    logger.error("request failed", logMeta);
  } else {
    logger.warn("request rejected", logMeta);
  }

  publicBody = { message };

  // Only expose the request id on errors so the client can include it
  // in a support ticket without us leaking internal details.
  if (status >= 500) {
    publicBody.requestId = requestId;
  }

  res.status(status).json(publicBody);
}

module.exports = errorHandler;
