/**
 * Validation rules for /api/reminder-rules/*.
 *
 * Mirrors the previous in-handler `validatePayload` rules exactly so the
 * request shapes clients send are unchanged:
 *   - POST   : name optional string ≤120; offsetDays integer in [-365, 365];
 *              channel in [email, whatsapp]; enabled + repeat booleans;
 *              repeatIntervalDays integer in [1, 365].
 *   - PATCH  : all of the above optional.
 */

const { body } = require("express-validator");
const { CHANNELS } = require("../../models/ReminderRule");

const NAME_MAX = 120;
const REPEAT_MIN = 1;
const REPEAT_MAX = 365;
const OFFSET_MIN = -365;
const OFFSET_MAX = 365;

function commonRules({ partial }) {
  const chain = (field) => (partial ? body(field).optional() : body(field));

  return [
    chain("name")
      .optional({ values: "falsy" })
      .isString().withMessage("name must be a string")
      .bail()
      .customSanitizer((v) => String(v).trim())
      .isLength({ max: NAME_MAX }).withMessage(`name is too long (max ${NAME_MAX})`),

    chain("offsetDays")
      .optional({ values: "falsy" })
      .isInt({ min: OFFSET_MIN, max: OFFSET_MAX })
      .withMessage(`offsetDays must be an integer between ${OFFSET_MIN} and ${OFFSET_MAX}`),

    chain("channel")
      .optional({ values: "falsy" })
      .isString().withMessage("channel must be a string")
      .bail()
      .isIn(CHANNELS)
      .withMessage(`channel must be one of: ${CHANNELS.join(", ")}`),

    chain("enabled")
      .optional({ values: "falsy" })
      .isBoolean().withMessage("enabled must be a boolean"),

    chain("repeat")
      .optional({ values: "falsy" })
      .isBoolean().withMessage("repeat must be a boolean"),

    chain("repeatIntervalDays")
      .optional({ nullable: true })
      .custom((v) => v === null || (Number.isInteger(v) && v >= REPEAT_MIN && v <= REPEAT_MAX))
      .withMessage(`repeatIntervalDays must be an integer between ${REPEAT_MIN} and ${REPEAT_MAX}, or null`),
  ];
}

// POST: offsetDays is required; channel defaults to "email" at the model
// level when omitted.
//
// NOTE: do NOT pass `{ values: "falsy" }` to `exists()` — it would treat
// `0` as missing and reject the legitimate "on due date" payload that
// the form sends when the user picks the On segment. Plain `exists()`
// only flags `undefined`, which is what we want here.
function createRules() {
  return [
    body("offsetDays")
      .exists().withMessage("offsetDays is required")
      .bail()
      .isInt({ min: OFFSET_MIN, max: OFFSET_MAX })
      .withMessage(`offsetDays must be an integer between ${OFFSET_MIN} and ${OFFSET_MAX}`),
    ...commonRules({ partial: true }),
  ];
}

const updateRules = commonRules({ partial: true });

module.exports = { createRules, updateRules };
