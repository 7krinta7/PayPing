const mongoose = require("mongoose");

/**
 * ReminderRule — user-configurable reminder schedule.
 *
 * Each rule defines WHEN a reminder should fire relative to an invoice's
 * due date, and THROUGH WHICH channel. Rules are evaluated by the
 * reminder engine when it is extended in a future phase.
 *
 * Extensibility notes:
 *   - `channel` is an enum so new channels (whatsapp, sms, push, ...) can
 *     be added without breaking existing documents.
 *   - `repeat` and `repeatIntervalDays` are reserved for the upcoming
 *     recurring-reminder feature and are validated but not consumed yet.
 *   - The existing `jobs/reminderJob.js` is intentionally untouched in
 *     this phase — its current behaviour (daily overdue scan) keeps
 *     working while rule-based scheduling lands behind the scenes.
 */

const CHANNELS = ["email", "whatsapp"];

const ReminderRuleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Optional human-readable label, e.g. "3 days before due".
    name: {
      type: String,
      trim: true,
      maxlength: 120
    },

    // Signed offset in days from the invoice's due date.
    //   -3  -> three days before the due date
    //    0  -> on the due date
    //   +7  -> seven days after the due date
    offsetDays: {
      type: Number,
      required: true,
      min: -365,
      max: 365
    },

    channel: {
      type: String,
      enum: CHANNELS,
      required: true,
      default: "email"
    },

    enabled: {
      type: Boolean,
      default: true
    },

    // Reserved for the upcoming recurring-reminder feature.
    repeat: {
      type: Boolean,
      default: false
    },

    // Days between repeated sends once `repeat` is true. Validated but
    // not yet consumed by the reminder job.
    repeatIntervalDays: {
      type: Number,
      min: 1,
      max: 365
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReminderRule", ReminderRuleSchema);
module.exports.CHANNELS = CHANNELS;
