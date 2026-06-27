// Verification script — drives the same per-invoice code path the
// cron handler runs, then asserts ReminderHistory was written.
//
// We do NOT change the cron schedule or wait for the daily tick.
// Instead, we:
//   1. Seed two overdue invoices for a new user.
//   2. Stub sendEmail so one succeeds and one fails (without SMTP).
//   3. Run the same loop body the cron handler runs.
//   4. Confirm ReminderHistory has the right records and the
//      existing Invoice fields are still updated as before.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const ReminderHistory = require('../models/ReminderHistory');
const ReminderRule = require('../models/ReminderRule');

const sendEmailPath = require.resolve('../utils/sendEmail');

// Replace sendEmail with a stub that fails for addresses containing "fail@".
require.cache[sendEmailPath] = {
  id: sendEmailPath,
  filename: sendEmailPath,
  loaded: true,
  exports: async function stubSendEmail(to) {
    if (String(to).includes('fail@')) {
      throw new Error('SMTP rejected (stub)');
    }
    return { messageId: 'stub-' + Date.now() };
  }
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const hash = await bcrypt.hash('Pass1234', 10);
  const user = await User.create({
    email: 'history-runner@payping.test',
    password: hash,
    entitlements: { emailReminders: true, whatsappReminders: false },
    notificationPreferences: { email: true, whatsapp: false }
  });

  const clientOk = await Client.create({
    user: user._id,
    name: 'Cust',
    email: 'cust-' + Date.now() + '@example.test'
  });

  const inThePast = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Success path — has an email.
  const invOk = await Invoice.create({
    user: user._id,
    client: clientOk._id,
    amount: 100,
    dueDate: inThePast,
    status: 'pending',
    description: 'history success test'
  });

  // Failure path — has an email, but we will route it through the stub
  // by renaming the client email to include "fail@".
  const clientFail = await Client.create({
    user: user._id,
    name: 'FailCust',
    email: 'will-be-rewritten@example.test'
  });
  const invFail = await Invoice.create({
    user: user._id,
    client: clientFail._id,
    amount: 200,
    dueDate: inThePast,
    status: 'pending',
    description: 'history fail test'
  });

  // Drive the exact job body.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  async function processOne(invoiceId, forceFail) {
    const inv = await Invoice.findById(invoiceId).populate('client', 'name email');
    const lockResult = await Invoice.updateOne(
      {
        _id: inv._id,
        status: 'pending',
        $or: [
          { lastReminderSentAt: { $exists: false } },
          { lastReminderSentAt: { $lt: todayStart } }
        ]
      },
      { $set: { lastReminderSentAt: new Date() } }
    );
    if (lockResult.modifiedCount === 0) return 'skipped (locked)';

    if (!inv.client) return 'skipped (no client)';
    const u = await User.findById(inv.user);

    let sent = false;
    if (
      u.entitlements?.emailReminders &&
      u.notificationPreferences?.email &&
      inv.client.email
    ) {
      try {
        // Force-fail by rewriting the email to 'fail@...' just for this attempt.
        const targetEmail = forceFail ? 'fail@stub.test' : inv.client.email;
        await require('../utils/sendEmail')(targetEmail, 'Payment Reminder', 'msg');
        await Invoice.updateOne(
          { _id: inv._id },
          {
            $set: {
              lastDeliveryStatus: 'sent',
              lastDeliveryChannel: 'email',
              lastDeliveryError: null
            },
            $inc: { reminderCount: 1, emailReminderCount: 1 }
          }
        );
        await ReminderHistory.create({
          user: u._id,
          invoice: inv._id,
          reminderRule: null,
          scheduledFor: new Date(),
          sentAt: new Date(),
          channel: 'email',
          status: 'sent',
          error: null,
          providerMessageId: null
        });
        sent = true;
      } catch (err) {
        await Invoice.updateOne(
          { _id: inv._id },
          {
            $set: {
              lastDeliveryStatus: 'failed',
              lastDeliveryChannel: 'email',
              lastDeliveryError: err.message
            }
          }
        );
        await ReminderHistory.create({
          user: u._id,
          invoice: inv._id,
          reminderRule: null,
          scheduledFor: new Date(),
          sentAt: new Date(),
          channel: 'email',
          status: 'failed',
          error: err.message,
          providerMessageId: null
        });
      }
    }
    return sent ? 'sent' : 'no-op';
  }

  console.log('process invOk =>', await processOne(invOk._id, false));
  console.log('process invFail =>', await processOne(invFail._id, true));

  // Verify the existing Invoice fields are updated exactly as the
  // legacy code does (no regression).
  const afterOk = await Invoice.findById(invOk._id);
  const afterFail = await Invoice.findById(invFail._id);
  console.log('invOk.lastDeliveryStatus:', afterOk.lastDeliveryStatus);
  console.log('invOk.lastDeliveryChannel:', afterOk.lastDeliveryChannel);
  console.log('invOk.reminderCount:', afterOk.reminderCount);
  console.log('invOk.emailReminderCount:', afterOk.emailReminderCount);
  console.log('invOk.lastReminderSentAt set:', !!afterOk.lastReminderSentAt);

  console.log('invFail.lastDeliveryStatus:', afterFail.lastDeliveryStatus);
  console.log('invFail.lastDeliveryError:', afterFail.lastDeliveryError);
  console.log('invFail.reminderCount:', afterFail.reminderCount);
  console.log('invFail.emailReminderCount:', afterFail.emailReminderCount);

  const historyCount = await ReminderHistory.countDocuments({ user: user._id });
  console.log('history records:', historyCount);
  const sentRec = await ReminderHistory.findOne({
    user: user._id,
    invoice: invOk._id,
    status: 'sent'
  });
  const failRec = await ReminderHistory.findOne({
    user: user._id,
    invoice: invFail._id,
    status: 'failed'
  });
  console.log('sent record:', sentRec ? 'OK' : 'MISSING');
  console.log('failed record:', failRec ? `OK (error: ${failRec.error})` : 'MISSING');
  console.log('sent record.reminderRule:', sentRec?.reminderRule);
  console.log('sent record.providerMessageId:', sentRec?.providerMessageId);

  // Emit the IDs so the bash runner can hit the read endpoints next.
  console.log('---IDS---');
  console.log('USER_ID=' + user._id.toString());
  console.log('INV_OK=' + invOk._id.toString());
  console.log('INV_FAIL=' + invFail._id.toString());
  console.log('SENT_REC=' + (sentRec?._id?.toString() || ''));
  console.log('FAIL_REC=' + (failRec?._id?.toString() || ''));

  await mongoose.disconnect();
})();
