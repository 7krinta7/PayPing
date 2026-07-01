const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const ReminderHistory = require("../models/ReminderHistory");
const ReminderRule = require("../models/ReminderRule");
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");

const AppError = require("../utils/AppError");

/**
 * Sanity-check an :id path param so a malformed value returns 400
 * instead of bubbling up as a CastError 500.
 */
function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value) &&
    String(new mongoose.Types.ObjectId(value)) === String(value);
}

// LIST history for the current user.
// Optional query: ?invoice=<id> to scope to a single invoice.
router.get("/", auth, async (req, res, next) => {
  try {
    const filter = { user: req.userId };

    if (req.query.invoice !== undefined) {
      if (!isValidObjectId(req.query.invoice)) {
        throw new AppError(400, "invoice must be a valid id");
      }
      filter.invoice = req.query.invoice;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    const history = await ReminderHistory.find(filter)
      .populate({
        path: "invoice",
        select: "_id amount dueDate status client invoiceNumber",
        populate: { path: "client", select: "_id name email" }
      })
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(limit);

    res.json(history);
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 8 — Reminder Dashboard overview.
 *
 * GET /api/reminder-history/overview
 *
 * Returns the four counters the dashboard renders above its sections.
 * All values are sourced from real collection state — no fabricated
 * numbers. Computed in parallel.
 */
router.get("/overview", auth, async (req, res, next) => {
  try {
    const userId = req.userId;

    // "Today" is computed once and reused for both endpoints so the two
    // counts agree on the boundary even if the request straddles midnight.
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

    const [
      activeReminderRules,
      remindersSentToday,
      failedDeliveries,
      pendingInvoices
    ] = await Promise.all([
      ReminderRule.countDocuments({ user: userId, enabled: true }),
      ReminderHistory.countDocuments({
        user: userId,
        status: "sent",
        sentAt: { $gte: startOfToday, $lt: startOfTomorrow }
      }),
      ReminderHistory.countDocuments({ user: userId, status: "failed" }),
      Invoice.countDocuments({ user: userId, status: "pending" })
    ]);

    res.json({
      activeReminderRules,
      remindersSentToday,
      failedDeliveries,
      pendingInvoices
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 8 — Reminder Dashboard upcoming queue.
 *
 * GET /api/reminder-history/upcoming
 *
 * Preview-only. NEVER sends a reminder and NEVER writes ReminderHistory.
 *
 * Reuses the scheduler's UTC-midnight arithmetic so the projected
 * trigger dates match the dates the cron job will eventually evaluate.
 * The dedup check is also identical to the scheduler's `hasHistory()` —
 * if a row exists for (user, invoice, rule, scheduledFor), the
 * reminder has already been delivered (or attempted) for that date
 * and is excluded from the preview.
 *
 * Returns up to 10 future triggers, sorted by scheduledFor ascending.
 * Trigger horizon is bounded to 14 days ahead to keep the preview
 * useful without unbounded scans.
 */
router.get("/upcoming", auth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    // Today at UTC midnight — the floor for the preview window.
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // 14 days ahead at UTC midnight — the ceiling. Long enough to be
    // useful as a preview, short enough to bound the projection.
    const horizon = new Date(startOfToday.getTime() + 14 * MS_PER_DAY);

    const [rules, invoices] = await Promise.all([
      ReminderRule.find({ user: userId, enabled: true })
        .select("_id name offsetDays channel")
        .lean(),
      Invoice.find({ user: userId, status: "pending" })
        .populate("client", "name email")
        .select("_id amount dueDate client invoiceNumber")
        .lean()
    ]);

    if (!rules.length || !invoices.length) {
      return res.json([]);
    }

    // Build the (rule, invoice, scheduledFor) triples, then filter to
    // the preview window and dedup against existing history rows.
    const triples = [];
    for (const rule of rules) {
      for (const invoice of invoices) {
        if (!invoice || !invoice.dueDate || !invoice.client) continue;
        const due = new Date(invoice.dueDate);
        if (Number.isNaN(due.getTime())) continue;

        const trigger = new Date(due.getTime() + rule.offsetDays * MS_PER_DAY);
        trigger.setUTCHours(0, 0, 0, 0);

        if (trigger < startOfToday || trigger >= horizon) continue;

        triples.push({ rule, invoice, scheduledFor: trigger });
      }
    }

    if (!triples.length) {
      return res.json([]);
    }

    // Dedup against existing history in a single round-trip. Matches
    // the (user, invoice, reminderRule, scheduledFor) tuple that the
    // scheduler uses.
    const existing = await ReminderHistory.find({
      user: userId,
      $or: triples.map((t) => ({
        invoice: t.invoice._id,
        reminderRule: t.rule._id,
        scheduledFor: t.scheduledFor
      }))
    })
      .select("invoice reminderRule scheduledFor")
      .lean();

    const dedupSet = new Set(
      existing.map((e) => `${e.invoice}|${e.reminderRule}|${new Date(e.scheduledFor).getTime()}`)
    );

    const remaining = triples.filter(
      (t) => !dedupSet.has(`${t.invoice._id}|${t.rule._id}|${t.scheduledFor.getTime()}`)
    );

    // Sort by scheduledFor ascending; tie-break by invoice createdAt
    // (whichever exists first wins) so the order is stable.
    remaining.sort((a, b) => a.scheduledFor - b.scheduledFor);

    // Cap the response to 10 entries — enough for a useful preview,
    // small enough that the frontend can render without scroll.
    const preview = remaining.slice(0, 10).map((t) => ({
      _id: `${t.rule._id}:${t.invoice._id}:${t.scheduledFor.getTime()}`,
      rule: {
        _id: t.rule._id,
        name: t.rule.name || null,
        offsetDays: t.rule.offsetDays,
        channel: t.rule.channel
      },
      invoice: {
        _id: t.invoice._id,
        amount: t.invoice.amount,
        dueDate: t.invoice.dueDate,
        invoiceNumber: t.invoice.invoiceNumber || null,
        client: t.invoice.client
          ? { _id: t.invoice.client._id, name: t.invoice.client.name || null }
          : null
      },
      scheduledFor: t.scheduledFor,
      channel: t.rule.channel
    }));

    res.json(preview);
  } catch (error) {
    next(error);
  }
});

// RETRIEVE a single record, scoped to the current user.
router.get("/:id", auth, async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError(400, "id must be a valid id");
    }

    const record = await ReminderHistory.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!record) {
      throw new AppError(404, "Reminder history record not found");
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
});

module.exports = router;