const mongoose = require("mongoose");

/**
 * ReminderHistory — append-only record of every reminder delivery attempt.
 *
 * Each entry represents a single send (or attempted send) for a specific
 * invoice, through a specific channel, optionally tied to a ReminderRule.
 *
 * Source of truth for:
 *   - Future rule-based scheduling
 *   - Retry logic
 *   - Analytics & invoice timelines
 *
 * Design notes:
 *   - `reminderRule` is nullable so existing "legacy" reminders emitted
 *     by the current overdue scan can be recorded without forcing a
 *     rule lookup.
 *   - `channel` is an enum so future channels (whatsapp, sms, push) can
 *     be added without breaking existing documents.
 *   - `status` is restricted to `sent` or `failed`. The `error` field
 *     carries the failure reason when applicable.
 *   - `providerMessageId` is reserved for the provider-side identifier
 *     (Twilio SID, SendGrid message-id, ...). Optional today.
 *   - `scheduledFor` lets the future scheduling engine record when a
 *     reminder was meant to fire even if the actual send was delayed
 *     (e.g. retry queues).
 */

const CHANNELS = ["email", "whatsapp"];

const ReminderHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true
    },

    // Nullable — the current overdue scan does not yet consult rules.
    reminderRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReminderRule",
      default: null
    },

    // When the reminder was supposed to fire.
    scheduledFor: {
      type: Date,
      required: true,
      default: () => new Date()
    },

    // When the actual send (or attempt) happened.
    sentAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },

    channel: {
      type: String,
      enum: CHANNELS,
      required: true
    },

    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true
    },

    error: {
      type: String,
      default: null
    },

    providerMessageId: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReminderHistory", ReminderHistorySchema);
module.exports.CHANNELS = CHANNELS;
