/**
 * reminderScheduler — Phase 4C
 *
 * Two independent runners that the cron job invokes each tick:
 *
 *   runRuleBasedScheduler()  — for users who have at least one ReminderRule,
 *                              evaluates (rule × pending invoice) against
 *                              `invoice.dueDate + rule.offsetDays == today`
 *                              and sends an email when the trigger date is
 *                              today. Dedup is via ReminderHistory lookup
 *                              keyed on (user, invoice, reminderRule, scheduledFor).
 *
 *   runLegacyOverdueScan()   — verbatim behaviour of the previous
 *                              `jobs/reminderJob.js` cron body, kept so that
 *                              users who have never created a rule continue
 *                              to receive their daily overdue reminder.
 *                              Dedup is via `Invoice.lastReminderSentAt`.
 *
 * Email delivery is unchanged — the runner delegates to `utils/sendEmail`
 * exactly like the legacy code does.
 */

const Invoice = require("../models/Invoice");
const User = require("../models/User");
const Client = require("../models/Client");
const ReminderHistory = require("../models/ReminderHistory");
const ReminderRule = require("../models/ReminderRule");
const sendEmail = require("../utils/sendEmail");
const { renderForUser } = require("../utils/emailTemplate");
const logger = require("../utils/logger");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WHATSAPP_MONTHLY_LIMIT = 100;

// `sendWhatsApp` is intentionally not required at the top — it is a stub
// today (Billing/WhatsApp are out of scope). Loading it lazily inside the
// legacy scan keeps the rule-driven path free of WhatsApp imports.
let sendWhatsApp = null;
try {
  // The repo ships this file at `utils/sendWhatsapp.js` (note the casing).
  sendWhatsApp = require("../utils/sendWhatsapp");
} catch (_) {
  sendWhatsApp = null;
}

/**
 * Append-only history writer. A failed write is intentionally swallowed so
 * it never disrupts the reminder pipeline (same contract the legacy job
 * relied on).
 */
async function recordHistory({
  userId,
  invoiceId,
  channel,
  status,
  error = null,
  scheduledFor = null,
  sentAt = null,
  reminderRuleId = null
}) {
  try {
    await ReminderHistory.create({
      user: userId,
      invoice: invoiceId,
      reminderRule: reminderRuleId,
      scheduledFor: scheduledFor || new Date(),
      sentAt: sentAt || new Date(),
      channel,
      status,
      error,
      providerMessageId: null
    });
  } catch (historyErr) {
    logger.error("⚠️ Reminder history write failed", { message: historyErr.message });
  }
}

/**
 * Build the trigger Date for an (invoice, rule) pair. `offsetDays` is a
 * signed day count from the invoice's due date. The returned Date is
 * normalised to UTC midnight so the value round-trips through Mongo and
 * dedup lookups identically across runs.
 */
function buildTriggerDate(invoice, rule) {
  const due = new Date(invoice.dueDate);
  const ms = due.getTime() + rule.offsetDays * MS_PER_DAY;
  const trig = new Date(ms);
  trig.setUTCHours(0, 0, 0, 0);
  return trig;
}

/** Compare two Dates on calendar-day components (UTC). */
function isSameUtcDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Dedup key for rule-driven sends. The unique key is the tuple
 * (user, invoice, reminderRule, scheduledFor). Two rules firing on the
 * same day produce different `scheduledFor` values and so do not collide.
 */
async function hasHistory(userId, invoiceId, ruleId, scheduledFor) {
  const hit = await ReminderHistory.findOne({
    user: userId,
    invoice: invoiceId,
    reminderRule: ruleId,
    scheduledFor
  }).lean();
  return Boolean(hit);
}

/**
 * Stateless monthly WhatsApp usage reset (preserved from the legacy code
 * so legacy counters keep advancing unchanged).
 */
async function resetMonthlyUsage(user, now) {
  const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
  if (user.usage?.billingMonth !== currentMonth) {
    user.usage = {
      whatsappThisMonth: 0,
      billingMonth: currentMonth
    };
    await user.save();
  }
}

/**
 * Send one reminder through the email transport. Mirrors the legacy
 * path's Invoice counter updates so users who migrate from legacy to
 * rules see no regression in dashboard metrics.
 *
 * Phase 7: the email body and subject are rendered from the user's
 * stored email template via `renderForUser`. Users who have not
 * customised their template get the legacy message verbatim (the
 * renderer's DEFAULT_EMAIL_* constants preserve the previous text).
 */
async function sendViaEmail(invoice, user) {
  const { subject, body } = renderForUser(user, invoice);
  try {
    await sendEmail(
      invoice.client.email,
      subject,
      body
    );

    await Invoice.updateOne(
      { _id: invoice._id },
      {
        $set: {
          lastDeliveryStatus: "sent",
          lastDeliveryChannel: "email",
          lastDeliveryError: null,
          lastReminderSentAt: new Date()
        },
        $inc: {
          reminderCount: 1,
          emailReminderCount: 1
        }
      }
    );
    return { ok: true };
  } catch (err) {
    await Invoice.updateOne(
      { _id: invoice._id },
      {
        $set: {
          lastDeliveryStatus: "failed",
          lastDeliveryChannel: "email",
          lastDeliveryError: err.message
        }
      }
    );
    return { ok: false, error: err.message };
  }
}

/**
 * Verbatim port of the legacy `jobs/reminderJob.js` cron body.
 *
 * Behaviour preserved:
 *   - daily overdue scan of `pending` invoices past their due date
 *   - `lastReminderSentAt` lock so each invoice gets at most one send per day
 *   - WhatsApp-first then email fallback (WhatsApp path uses the stub util)
 *   - ReminderHistory writes with `reminderRule: null`
 *
 * The only structural change is that the body is wrapped in a named
 * function so it can run alongside the rules engine without diverging.
 */
async function runLegacyOverdueScan(now = new Date()) {
  try {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const overdueInvoices = await Invoice.find({
      status: "pending",
      dueDate: { $lt: now }
    }).populate("client", "name email");

    for (const invoice of overdueInvoices) {
      if (!invoice.client) {
        logger.warn(`⚠️ Skipping invoice ${invoice._id} — client missing`);
        continue;
      }

      const user = await User.findById(invoice.user);
      if (!user) continue;

      await resetMonthlyUsage(user, now);

      // 🔒 ATOMIC LOCK — only one send per invoice per day
      const lockResult = await Invoice.updateOne(
        {
          _id: invoice._id,
          status: "pending",
          $or: [
            { lastReminderSentAt: { $exists: false } },
            { lastReminderSentAt: { $lt: todayStart } }
          ]
        },
        { $set: { lastReminderSentAt: new Date() } }
      );

      if (lockResult.modifiedCount === 0) continue;

      // Phase 7: render the user's stored template (or default if not
      // customised) instead of the legacy hard-coded message.
      const { subject: emailSubject, body: emailBody } = renderForUser(user, invoice);

      let sent = false;

      // 📲 WHATSAPP (priority)
      if (
        process.env.ENABLE_WHATSAPP === "true" &&
        user.entitlements?.whatsappReminders &&
        user.notificationPreferences?.whatsapp &&
        user.whatsappNumber &&
        (user.usage?.whatsappThisMonth || 0) < WHATSAPP_MONTHLY_LIMIT
      ) {
        try {
          await sendWhatsApp(
            user.whatsappNumber,
            `₹${invoice.amount} pending. Due ${new Date(invoice.dueDate).toDateString()}`
          );

          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "sent",
                lastDeliveryChannel: "whatsapp",
                lastDeliveryError: null
              },
              $inc: {
                reminderCount: 1,
                whatsappReminderCount: 1
              }
            }
          );

          user.usage.whatsappThisMonth =
            (user.usage?.whatsappThisMonth || 0) + 1;
          await user.save();

          await recordHistory({
            userId: user._id,
            invoiceId: invoice._id,
            channel: "whatsapp",
            status: "sent",
            reminderRuleId: null
          });

          sent = true;
        } catch (err) {
          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "failed",
                lastDeliveryChannel: "whatsapp",
                lastDeliveryError: err.message
              }
            }
          );

          await recordHistory({
            userId: user._id,
            invoiceId: invoice._id,
            channel: "whatsapp",
            status: "failed",
            error: err.message,
            reminderRuleId: null
          });
        }
      }

      // 📧 EMAIL (fallback)
      if (
        !sent &&
        user.entitlements?.emailReminders &&
        user.notificationPreferences?.email &&
        invoice.client.email
      ) {
        try {
          await sendEmail(
            invoice.client.email,
            emailSubject,
            emailBody
          );

          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "sent",
                lastDeliveryChannel: "email",
                lastDeliveryError: null
              },
              $inc: {
                reminderCount: 1,
                emailReminderCount: 1
              }
            }
          );

          await recordHistory({
            userId: user._id,
            invoiceId: invoice._id,
            channel: "email",
            status: "sent",
            reminderRuleId: null
          });

          sent = true;
        } catch (err) {
          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "failed",
                lastDeliveryChannel: "email",
                lastDeliveryError: err.message
              }
            }
          );

          await recordHistory({
            userId: user._id,
            invoiceId: invoice._id,
            channel: "email",
            status: "failed",
            error: err.message,
            reminderRuleId: null
          });
        }
      }

      if (sent) {
        logger.info(`✅ Reminder sent | invoice=${invoice._id}`);
      }
    }
  } catch (error) {
    logger.error("❌ Legacy overdue scan error", { message: error.message });
  }
}

/**
 * Rule-driven scheduler. Iterates every user that has at least one
 * ReminderRule and evaluates each (rule × pending invoice) pair. A send
 * happens only when:
 *
 *   1. The rule is enabled.
 *   2. triggerDate = invoice.dueDate + rule.offsetDays == today.
 *   3. No ReminderHistory row exists for (user, invoice, rule, scheduledFor).
 *   4. The user is entitled + opted in to the rule's channel.
 *
 * Repeat / repeatIntervalDays are intentionally not read — those fields
 * remain reserved for a later phase.
 */
async function runRuleBasedScheduler(now = new Date()) {
  try {
    // Distinct user ids that have any reminder rule. Distinct keeps this
    // O(rules) rather than O(rules × users).
    const userIds = await ReminderRule.distinct("user");
    if (!userIds.length) return;

    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user) continue;

      const [rules, invoices] = await Promise.all([
        ReminderRule.find({ user: userId, enabled: true }),
        Invoice.find({ user: userId, status: "pending" }).populate(
          "client",
          "name email"
        )
      ]);

      if (!rules.length || !invoices.length) continue;

      for (const rule of rules) {
        for (const invoice of invoices) {
          if (!invoice.client) {
            logger.warn(
              `⚠️ Skipping invoice ${invoice._id} — client missing`
            );
            continue;
          }

          const triggerDate = buildTriggerDate(invoice, rule);
          if (!isSameUtcDay(triggerDate, now)) continue;

          // Dedup via ReminderHistory.
          if (await hasHistory(user._id, invoice._id, rule._id, triggerDate)) {
            continue;
          }

          // Phase 4C only wires email. WhatsApp rules route through the
          // stub util so the rule-driven path stays Billing/WhatsApp-free.
          if (rule.channel !== "email") {
            // Skip non-email channels this phase — but still record a
            // history row so a future phase can retry without resending.
            // We deliberately write `status: "failed"` with a clear error
            // so the row shows up in audit trails instead of being silent.
            await recordHistory({
              userId: user._id,
              invoiceId: invoice._id,
              channel: rule.channel,
              status: "failed",
              error: `channel "${rule.channel}" not enabled in this phase`,
              scheduledFor: triggerDate,
              sentAt: new Date(),
              reminderRuleId: rule._id
            });
            continue;
          }

          // Entitlement + opt-in gate. Without these the legacy code would
          // still attempt the send — here we honour the same gate so a
          // user who has disabled email reminders does not get one.
          if (
            !user.entitlements?.emailReminders ||
            !user.notificationPreferences?.email ||
            !invoice.client.email
          ) {
            continue;
          }

          const result = await sendViaEmail(invoice, user);

          await recordHistory({
            userId: user._id,
            invoiceId: invoice._id,
            channel: "email",
            status: result.ok ? "sent" : "failed",
            error: result.ok ? null : result.error,
            scheduledFor: triggerDate,
            sentAt: new Date(),
            reminderRuleId: rule._id
          });

          if (result.ok) {
            logger.info(
              `✅ Rule reminder sent | rule=${rule._id} invoice=${invoice._id}`
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error("❌ Rule-based scheduler error", { message: error.message });
  }
}

module.exports = {
  runRuleBasedScheduler,
  runLegacyOverdueScan,
  // exported for the verification harness
  _internal: {
    buildTriggerDate,
    isSameUtcDay,
    hasHistory,
    recordHistory,
    sendViaEmail,
    resetMonthlyUsage
  }
};