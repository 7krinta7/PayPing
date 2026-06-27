/**
 * Tiny wrapper around express-validator's validationResult.
 *
 * Usage:
 *   const { body } = require("express-validator");
 *   const validate = require("../middleware/validate");
 *   router.post("/x", [body("email").isEmail(), validate], handler);
 *
 * On failure: throws an AppError(400, joined messages) — the central
 * error handler converts that into the JSON response.
 */

const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const messages = result.array().map((e) => {
    const path = e.path || e.param || "field";
    return `${path}: ${e.msg}`;
  });

  next(new AppError(400, messages.join("; ")));
}

module.exports = validate;
