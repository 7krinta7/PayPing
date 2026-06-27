/**
 * Validation rules for /api/auth/*.
 *
 * Behaviour parity with the previous in-handler checks:
 *   - register: email + password presence, email format, password ≥ 8.
 *   - login:    email + password presence.
 */

const { body } = require("express-validator");

const PASSWORD_MIN = 8;

const registerRules = [
  body("email")
    .exists({ values: "falsy" }).withMessage("email is required")
    .bail()
    .isString().withMessage("email must be a string")
    .bail()
    .trim()
    .notEmpty().withMessage("email cannot be empty")
    .isEmail().withMessage("email must be a valid email address")
    .normalizeEmail(),
  body("password")
    .exists({ values: "falsy" }).withMessage("password is required")
    .bail()
    .isString().withMessage("password must be a string")
    .bail()
    .isLength({ min: PASSWORD_MIN })
    .withMessage(`password must be at least ${PASSWORD_MIN} characters`),
];

const loginRules = [
  body("email")
    .exists({ values: "falsy" }).withMessage("email is required")
    .bail()
    .isString().withMessage("email must be a string")
    .bail()
    .trim()
    .notEmpty().withMessage("email cannot be empty"),
  body("password")
    .exists({ values: "falsy" }).withMessage("password is required")
    .bail()
    .isString().withMessage("password must be a string"),
];

module.exports = { registerRules, loginRules };
