require("dotenv").config();
const validateEnv = require("../config/validateEnv");
const logger = require("../utils/logger");
const cron = require("node-cron");
const connectDB = require("../config/db");

// The cron worker doesn't need the auth secret, but it does need
// Mongo + email creds to deliver reminders. Fail fast if any are
// missing — better than silently doing nothing on the schedule.
validateEnv(["MONGO_URI", "EMAIL_USER", "EMAIL_PASS"]);

const {
  runRuleBasedScheduler,
  runLegacyOverdueScan
} = require("../services/reminderScheduler");

connectDB().then(() => {
  logger.info("✅ Reminder job file loaded");
});

/**
 * Runs daily at 9 AM.
 *
 * The cron body is intentionally tiny: it only schedules the two runners
 * defined in `services/reminderScheduler.js`.
 *
 *   - runLegacyOverdueScan preserves the previous behaviour for users
 *     who have never created a ReminderRule.
 *   - runRuleBasedScheduler evaluates every (rule × pending invoice)
 *     pair for users who have at least one rule, dedup via
 *     ReminderHistory.
 *
 * `Promise.allSettled` keeps both runners independent: a failure in one
 * does not block the other, and the cron tick still completes.
 */
cron.schedule("0 9 * * *", async () => {
  const results = await Promise.allSettled([
    runLegacyOverdueScan(),
    runRuleBasedScheduler()
  ]);

  for (const r of results) {
    if (r.status === "rejected") {
      console.error("❌ Reminder runner rejected:", r.reason);
    }
  }
});