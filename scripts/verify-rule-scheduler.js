// verify-rule-scheduler.js — Phase 4C verification harness.
//
// Asserts the five acceptance points from the phase brief without
// requiring SMTP:
//
//   1. Legacy users (no rules) still receive overdue reminders.
//   2. Rule-aware users receive reminders on configured dates.
//   3. Duplicate reminders are prevented.
//   4. ReminderHistory rows are written correctly (legacy: null rule,
//      rule-driven: rule._id + scheduledFor = trigger date).
//
// Strategy mirrors scripts/verify-history.js:
//   - stub utils/sendEmail via require.cache before the scheduler loads
//   - directly invoke the scheduler runners from services/reminderScheduler.js
//   - assert on ReminderHistory + Invoice state after each run
//
// Run with: `node scripts/verify-rule-scheduler.js`

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const ReminderRule = require('../models/ReminderRule');
const ReminderHistory = require('../models/ReminderHistory');

const sendEmailPath = require.resolve('../utils/sendEmail');

// Replace sendEmail with a counting stub BEFORE the scheduler module is
// required. The scheduler captures the stub reference at first require.
let sendCalls = [];
require.cache[sendEmailPath] = {
  id: sendEmailPath,
  filename: sendEmailPath,
  loaded: true,
  exports: async function stubSendEmail(to, subject, text) {
    sendCalls.push({ to, subject, at: new Date() });
    if (String(to).includes('fail@')) {
      throw new Error('SMTP rejected (stub)');
    }
    return { messageId: 'stub-' + Date.now() };
  }
};

const scheduler = require('../services/reminderScheduler');

// Disable WhatsApp in the legacy scan regardless of env. The stub
// util is a no-op so this is belt-and-braces.
process.env.ENABLE_WHATSAPP = 'false';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
}

function utcMidnight(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const tag = 'rulesched-' + Date.now();

  // ---------- Test 1: legacy user (no rules) gets overdue reminder ----------
  console.log('\n--- Test 1: legacy overdue scan ---');
  {
    const legacyUser = await User.create({
      email: `${tag}-legacy@payping.test`,
      password: await bcrypt.hash('Pass1234', 10),
      entitlements: { emailReminders: true, whatsappReminders: false },
      notificationPreferences: { email: true, whatsapp: false }
    });
    const legacyClient = await Client.create({
      user: legacyUser._id,
      name: 'LegacyCust',
      email: `${tag}-legacy@example.test`
    });
    const overdueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const legacyInv = await Invoice.create({
      user: legacyUser._id,
      client: legacyClient._id,
      amount: 500,
      dueDate: overdueDate,
      status: 'pending',
      description: 'legacy overdue'
    });

    sendCalls = [];
    await scheduler.runLegacyOverdueScan();

    const histRows = await ReminderHistory.find({
      user: legacyUser._id,
      invoice: legacyInv._id
    });
    assert(histRows.length === 1, `legacy history rows: ${histRows.length}`);
    assert(
      histRows[0].reminderRule === null,
      'legacy row reminderRule must be null'
    );
    assert(histRows[0].channel === 'email', 'legacy row channel must be email');
    assert(histRows[0].status === 'sent', 'legacy row status must be sent');
    assert(sendCalls.length === 1, `legacy send calls: ${sendCalls.length}`);

    const invAfter = await Invoice.findById(legacyInv._id);
    assert(invAfter.reminderCount === 1, 'legacy reminderCount');
    assert(
      invAfter.lastDeliveryStatus === 'sent',
      'legacy lastDeliveryStatus'
    );
    assert(
      invAfter.lastDeliveryChannel === 'email',
      'legacy lastDeliveryChannel'
    );
    console.log('✅ legacy overdue scan: 1 send, history row written');

    // Re-running must NOT send again (the lastReminderSentAt lock).
    sendCalls = [];
    await scheduler.runLegacyOverdueScan();
    const histRowsAfter = await ReminderHistory.countDocuments({
      user: legacyUser._id,
      invoice: legacyInv._id
    });
    assert(
      sendCalls.length === 0,
      `legacy re-run send calls: ${sendCalls.length}`
    );
    assert(
      histRowsAfter === 1,
      `legacy re-run history rows: ${histRowsAfter}`
    );
    console.log('✅ legacy re-run: 0 sends (lock works)');

    // Save for cleanup.
    global.__legacyIds = {
      user: legacyUser._id,
      invoice: legacyInv._id
    };
  }

  // ---------- Test 2: rule-aware user receives rule-driven reminders ----------
  console.log('\n--- Test 2: rule-based scheduler ---');
  let ruleMinus7Id, rulePlus1Id, invoiceDueTodayId, invoiceDueIn7Id,
      invoiceDueYesterdayId;
  {
    const ruleUser = await User.create({
      email: `${tag}-rule@payping.test`,
      password: await bcrypt.hash('Pass1234', 10),
      entitlements: { emailReminders: true, whatsappReminders: false },
      notificationPreferences: { email: true, whatsapp: false }
    });
    const ruleClient = await Client.create({
      user: ruleUser._id,
      name: 'RuleCust',
      email: `${tag}-rule@example.test`
    });

    const ruleMinus7 = await ReminderRule.create({
      user: ruleUser._id,
      name: '7 days before',
      offsetDays: -7,
      channel: 'email',
      enabled: true
    });
    const rulePlus1 = await ReminderRule.create({
      user: ruleUser._id,
      name: '1 day after',
      offsetDays: 1,
      channel: 'email',
      enabled: true
    });
    ruleMinus7Id = ruleMinus7._id.toString();
    rulePlus1Id = rulePlus1._id.toString();

    // Three invoices: due today, due in 7 days, due yesterday.
    const today = utcMidnight(new Date());
    const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const invToday = await Invoice.create({
      user: ruleUser._id,
      client: ruleClient._id,
      amount: 100,
      dueDate: today,
      status: 'pending',
      description: 'due today'
    });
    const invIn7 = await Invoice.create({
      user: ruleUser._id,
      client: ruleClient._id,
      amount: 200,
      dueDate: in7,
      status: 'pending',
      description: 'due in 7 days'
    });
    const invYesterday = await Invoice.create({
      user: ruleUser._id,
      client: ruleClient._id,
      amount: 300,
      dueDate: yesterday,
      status: 'pending',
      description: 'due yesterday'
    });
    invoiceDueTodayId = invToday._id;
    invoiceDueIn7Id = invIn7._id;
    invoiceDueYesterdayId = invYesterday._id;

    sendCalls = [];
    await scheduler.runRuleBasedScheduler();

    // Expectations:
    //   - invToday  + rule(-7d)  → trigger = today - 7  → no send
    //   - invToday  + rule(+1d)  → trigger = today + 1  → no send
    //   - invIn7    + rule(-7d)  → trigger = today      → SEND
    //   - invIn7    + rule(+1d)  → trigger = today + 8  → no send
    //   - invYest   + rule(-7d)  → trigger = today - 8  → no send
    //   - invYest   + rule(+1d)  → trigger = today      → SEND
    assert(
      sendCalls.length === 2,
      `rule-driven sends expected 2, got ${sendCalls.length}`
    );

    const histRows = await ReminderHistory.find({ user: ruleUser._id });
    assert(
      histRows.length === 2,
      `rule history rows expected 2, got ${histRows.length}`
    );

    // Test 4 (history correctness) — row for rule(+1d) must reference
    // rulePlus1 and scheduledFor must equal UTC midnight of today.
    const plus1Row = histRows.find(
      (r) => String(r.reminderRule) === rulePlus1Id
    );
    assert(plus1Row, 'history row for rule(+1d) missing');
    assert(
      plus1Row.invoice.toString() === invoiceDueYesterdayId.toString(),
      'rule(+1d) row should reference yesterday invoice'
    );
    assert(
      plus1Row.scheduledFor.getTime() === today.getTime(),
      `rule(+1d) scheduledFor expected ${today.toISOString()}, got ${plus1Row.scheduledFor.toISOString()}`
    );
    assert(plus1Row.status === 'sent', 'rule(+1d) status should be sent');

    const minus7Row = histRows.find(
      (r) => String(r.reminderRule) === ruleMinus7Id
    );
    assert(minus7Row, 'history row for rule(-7d) missing');
    assert(
      minus7Row.invoice.toString() === invoiceDueIn7Id.toString(),
      'rule(-7d) row should reference due-in-7 invoice'
    );
    assert(
      minus7Row.scheduledFor.getTime() === today.getTime(),
      'rule(-7d) scheduledFor should equal today UTC midnight'
    );
    console.log(
      '✅ rule-based scheduler: 2 sends for the 2 expected triggers'
    );
    console.log('✅ rule-driven history rows reference rule + scheduledFor');

    // Save for cleanup.
    global.__ruleIds = {
      user: ruleUser._id,
      rules: [ruleMinus7._id, rulePlus1._id],
      invoices: [invToday._id, invIn7._id, invYesterday._id]
    };
  }

  // ---------- Test 3: duplicate prevention ----------
  console.log('\n--- Test 3: duplicate prevention ---');
  {
    const beforeCount = await ReminderHistory.countDocuments({
      user: global.__ruleIds.user
    });
    sendCalls = [];
    await scheduler.runRuleBasedScheduler();
    const afterCount = await ReminderHistory.countDocuments({
      user: global.__ruleIds.user
    });
    assert(
      sendCalls.length === 0,
      `duplicate run sent ${sendCalls.length} emails`
    );
    assert(
      afterCount === beforeCount,
      `duplicate run added ${afterCount - beforeCount} history rows`
    );
    console.log(
      '✅ second run: 0 sends, 0 new history rows (ReminderHistory dedup works)'
    );
  }

  console.log('\n✅ ALL CHECKS PASS');
  console.log(`sendCalls captured during the run: ${sendCalls.length}`);

  // ---------- Cleanup ----------
  const legacy = global.__legacyIds || {};
  const rule = global.__ruleIds || {};
  await ReminderHistory.deleteMany({
    user: { $in: [legacy.user, rule.user].filter(Boolean) }
  });
  await ReminderRule.deleteMany({ _id: { $in: rule.rules || [] } });
  await Invoice.deleteMany({
    _id: {
      $in: [legacy.invoice, ...(rule.invoices || [])].filter(Boolean)
    }
  });
  await Client.deleteMany({
    user: { $in: [legacy.user, rule.user].filter(Boolean) }
  });
  await User.deleteMany({
    _id: { $in: [legacy.user, rule.user].filter(Boolean) }
  });

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('\n❌ VERIFICATION FAILED:', err.message);
  console.error(err.stack);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});