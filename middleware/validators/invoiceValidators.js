/**
 * Validation rules for /api/invoices/*.
 *
 * Mirrors the previous in-handler checks for create + update:
 *   - POST /              : client ObjectId, amount number > 0, dueDate ISO, description string.
 *   - PATCH /:id          : all fields optional, but amount if present must be number > 0.
 *
 * The ObjectId check uses mongoose's Type validator to keep the failure
 * mode identical to the previous CastError → 400 conversion in the error
 * handler.
 */

const { body } = require("express-validator");
const mongoose = require("mongoose");

const DESCRIPTION_MAX = 1000;

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value) &&
    String(new mongoose.Types.ObjectId(value)) === String(value);
}

const createRules = [
  body("client")
    .exists({ values: "falsy" }).withMessage("client is required")
    .bail()
    .custom(isValidObjectId).withMessage("client must be a valid id"),
  body("amount")
    .exists({ values: "falsy" }).withMessage("amount is required")
    .bail()
    .isFloat({ gt: 0 }).withMessage("amount must be greater than 0"),
  body("dueDate")
    .exists({ values: "falsy" }).withMessage("dueDate is required")
    .bail()
    .isISO8601().withMessage("dueDate must be a valid ISO 8601 date"),
  body("description")
    .optional({ values: "falsy" })
    .isString().withMessage("description must be a string")
    .bail()
    .isLength({ max: DESCRIPTION_MAX })
    .withMessage(`description is too long (max ${DESCRIPTION_MAX})`),
];

const updateRules = [
  body("client")
    .optional()
    .custom(isValidObjectId).withMessage("client must be a valid id"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 }).withMessage("amount must be greater than 0"),
  body("dueDate")
    .optional()
    .isISO8601().withMessage("dueDate must be a valid ISO 8601 date"),
  body("description")
    .optional({ values: "falsy" })
    .isString().withMessage("description must be a string")
    .bail()
    .isLength({ max: DESCRIPTION_MAX })
    .withMessage(`description is too long (max ${DESCRIPTION_MAX})`),
];

module.exports = { createRules, updateRules };
