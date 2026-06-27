/**
 * Validation rules for /api/email-template.
 *
 * Both subject and body are optional strings. Empty strings clear the
 * user's customisation so the reminder scheduler falls back to the
 * DEFAULT_EMAIL_* constants. Both fields are bounded so a runaway
 * client cannot blow past the User.emailTemplate.* maxlength.
 */

const { body } = require("express-validator");

const SUBJECT_MAX = 200;
const BODY_MAX = 5000;

const updateRules = [
  body("subject")
    .optional({ values: "falsy" })
    .isString().withMessage("subject must be a string")
    .bail()
    .customSanitizer((v) => String(v))
    .isLength({ max: SUBJECT_MAX })
    .withMessage(`subject is too long (max ${SUBJECT_MAX})`),

  body("body")
    .optional({ values: "falsy" })
    .isString().withMessage("body must be a string")
    .bail()
    .isLength({ max: BODY_MAX })
    .withMessage(`body is too long (max ${BODY_MAX})`),
];

module.exports = { updateRules };
