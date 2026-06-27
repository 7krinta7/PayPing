/**
 * Validation rules for /api/user/*.
 *
 * Mirrors the previous in-handler checks:
 *   - PATCH /me/profile: businessName optional, string, ≤120 chars (trimmed).
 *   - PATCH /me/password: currentPassword + newPassword strings, newPassword ≥ 8.
 *   - PATCH /me/notifications: email boolean (optional).
 */

const { body } = require("express-validator");

const BUSINESS_NAME_MAX = 120;
const PASSWORD_MIN = 8;

const profileRules = [
  body("email").not().exists().withMessage("email cannot be updated through this endpoint"),
  body("password").not().exists().withMessage("password cannot be updated through this endpoint"),
  body("businessName")
    .optional()
    .isString().withMessage("businessName must be a string")
    .bail()
    .customSanitizer((v) => String(v).trim())
    .isLength({ max: BUSINESS_NAME_MAX })
    .withMessage(`businessName is too long (max ${BUSINESS_NAME_MAX})`),
];

const passwordRules = [
  body("currentPassword")
    .exists({ values: "falsy" }).withMessage("currentPassword is required")
    .bail()
    .isString().withMessage("currentPassword must be a string")
    .bail()
    .custom((v) => String(v).trim().length > 0)
    .withMessage("currentPassword is required"),
  body("newPassword")
    .exists({ values: "falsy" }).withMessage("newPassword is required")
    .bail()
    .isString().withMessage("newPassword must be a string")
    .bail()
    .custom((v) => String(v).trim().length > 0)
    .withMessage("newPassword is required")
    .bail()
    .isLength({ min: PASSWORD_MIN })
    .withMessage(`newPassword must be at least ${PASSWORD_MIN} characters`),
];

const notificationsRules = [
  body("email")
    .optional()
    .isBoolean().withMessage("email must be a boolean"),
];

module.exports = { profileRules, passwordRules, notificationsRules };
