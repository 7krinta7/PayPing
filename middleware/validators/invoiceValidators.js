/**
 * Validation rules for /api/invoices/*.
 *
 * Mirrors the previous in-handler checks for create + update:
 *   - POST /              : client ObjectId, amount number > 0, dueDate ISO,
 *                           description string, invoiceNumber required (string,
 *                           ≤50 chars, trimmed). Existing legacy invoices
 *                           that pre-date the field can still be edited and
 *                           given a number through PATCH (see updateRules).
 *   - PATCH /:id          : all fields optional, but amount if present must be
 *                           number > 0. invoiceNumber is optional so users can
 *                           add a number to a legacy invoice over time.
 *
 * The ObjectId check uses mongoose's Type validator to keep the failure
 * mode identical to the previous CastError → 400 conversion in the error
 * handler.
 */

const { body } = require("express-validator");
const mongoose = require("mongoose");

const DESCRIPTION_MAX = 1000;
const INVOICE_NUMBER_MAX = 50;

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
  body("invoiceNumber")
    .exists({ values: "falsy" }).withMessage("invoiceNumber is required")
    .bail()
    .isString().withMessage("invoiceNumber must be a string")
    .bail()
    .customSanitizer((v) => String(v).trim())
    .notEmpty().withMessage("invoiceNumber is required")
    .bail()
    .isLength({ max: INVOICE_NUMBER_MAX })
    .withMessage(`invoiceNumber is too long (max ${INVOICE_NUMBER_MAX})`),
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
  // Optional on update so legacy invoices (created before the field
  // existed) can be back-filled manually, and so the user can clear the
  // value by sending "".
  body("invoiceNumber")
    .optional({ values: "falsy" })
    .isString().withMessage("invoiceNumber must be a string")
    .bail()
    .customSanitizer((v) => String(v).trim())
    .isLength({ max: INVOICE_NUMBER_MAX })
    .withMessage(`invoiceNumber is too long (max ${INVOICE_NUMBER_MAX})`),
];

module.exports = { createRules, updateRules };
