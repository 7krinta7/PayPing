/**
 * Validation rules for /api/clients/*.
 *
 * Mirrors the previous in-handler checks for create + update:
 *   - POST /     : name required non-empty string; email optional format; phone optional string.
 *   - PATCH /:id : same, but all fields optional.
 */

const { body } = require("express-validator");

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const PHONE_MAX = 32;

const baseFields = [
  body("name")
    .optional()
    .isString().withMessage("name must be a string")
    .bail()
    .customSanitizer((v) => String(v).trim())
    .notEmpty().withMessage("name cannot be empty")
    .isLength({ max: NAME_MAX }).withMessage(`name is too long (max ${NAME_MAX})`),
  body("email")
    .optional({ values: "falsy" })
    .isString().withMessage("email must be a string")
    .bail()
    .trim()
    .isLength({ max: EMAIL_MAX }).withMessage(`email is too long (max ${EMAIL_MAX})`)
    .bail()
    .isEmail().withMessage("email must be a valid email address"),
  body("phone")
    .optional({ values: "falsy" })
    .isString().withMessage("phone must be a string")
    .bail()
    .trim()
    .isLength({ max: PHONE_MAX }).withMessage(`phone is too long (max ${PHONE_MAX})`),
];

// POST /api/clients — name is required.
const createRules = [
  body("name")
    .exists({ values: "falsy" }).withMessage("name is required")
    .bail()
    .isString().withMessage("name must be a string")
    .bail()
    .customSanitizer((v) => String(v).trim())
    .notEmpty().withMessage("name cannot be empty")
    .isLength({ max: NAME_MAX }).withMessage(`name is too long (max ${NAME_MAX})`),
  body("email")
    .optional({ values: "falsy" })
    .isString().withMessage("email must be a string")
    .bail()
    .trim()
    .isLength({ max: EMAIL_MAX }).withMessage(`email is too long (max ${EMAIL_MAX})`)
    .bail()
    .isEmail().withMessage("email must be a valid email address"),
  body("phone")
    .optional({ values: "falsy" })
    .isString().withMessage("phone must be a string")
    .bail()
    .trim()
    .isLength({ max: PHONE_MAX }).withMessage(`phone is too long (max ${PHONE_MAX})`),
];

const updateRules = baseFields;

module.exports = { createRules, updateRules };
