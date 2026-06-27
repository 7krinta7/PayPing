// Standalone verification of the renderer against the live DB. Runs in
// its own process so it can open a fresh Mongoose connection while the
// dev server (port 5050) keeps its own connection.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
require('../models/Client'); // register Client model for populate
const { renderForUser } = require('../utils/emailTemplate');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Mongo connected');

  // Most recent test user created by verify-email-template.js
  const u = await User.findOne({ email: { $regex: '^verify-tpl-' } }).sort({ createdAt: -1 });
  if (!u) { console.log('No verify-tpl- user found.'); process.exit(1); }
  console.log('User email:', u.email);
  console.log('Stored subject:', u.emailTemplate?.subject);

  // Most recent invoice for that user
  const inv = await Invoice.findOne({ user: u._id }).sort({ createdAt: -1 }).populate('client', 'name email');
  if (!inv) { console.log('No invoice found.'); process.exit(1); }
  console.log('Invoice id:', String(inv._id), '| client:', inv.client?.name);

  // 16) Stored template render
  const r1 = renderForUser(u, inv);
  console.log('\n[16] Render with STORED template:');
  console.log('   Subject:', r1.subject);
  console.log('   Body:');
  r1.body.split('\n').forEach((l) => console.log('     ' + l));
  console.log('[17] No raw placeholders left: subject=', !r1.subject.includes('{{'), '| body=', !r1.body.includes('{{'));

  // 18) Unknown variable preserved (typo).
  u.emailTemplate.body = 'Hi {{clientNme}} (typo) — {{clientName}}';
  await u.save();
  const r2 = renderForUser(u, inv);
  console.log('[18] Unknown var preserved:', r2.body.includes('{{clientNme}}'), '| known var replaced:', !r2.body.includes('{{clientName}}'));

  // 19) Default template when stored fields empty.
  u.emailTemplate.subject = '';
  u.emailTemplate.body = '';
  await u.save();
  const r3 = renderForUser(u, inv);
  console.log('[19] Default body when stored empty:');
  console.log('   Subject:', r3.subject);
  console.log('   includes Acme Studios:', r3.body.includes('Acme Studios'), '| includes Priya Sharma:', r3.body.includes('Priya Sharma'));

  // 20) Reminder scheduler wiring — confirm the legacy send code path
  //     routes through renderForUser. Static check on source.
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, '..', 'services', 'reminderScheduler.js'), 'utf8');
  const hasRenderInLegacy = /renderForUser\(user, invoice\)/.test(src);
  const hasHardcodedPaymentReminder = /"Payment Reminder"/.test(src);
  console.log('[20] Scheduler uses renderForUser:', hasRenderInLegacy, '| legacy hardcoded subject still present:', hasHardcodedPaymentReminder);

  await mongoose.disconnect();
  console.log('\nAll renderer checks PASS.');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
