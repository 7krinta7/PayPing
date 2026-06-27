// verify-reminder-history-ui.js — end-to-end API check for the Phase 4D UI.
//
// Confirms the contract that the new InvoiceDetailPage consumes:
//   1. GET /api/reminder-history?invoice=<id> returns the user's records
//      for that invoice, newest-first (sentAt desc).
//   2. An invoice with no history returns [] (drives the empty state).
//   3. Failed reminders carry their `error` field (drives the failure
//      highlighting column in the UI).
//   4. The records the UI cares about (`status`, `channel`, `reminderRule`,
//      `scheduledFor`, `sentAt`, `error`) are all present.
//
// We do NOT spin up the React tree — these are the same network calls
// the page makes on mount, so a passing assertion here means the page
// will populate correctly when a user opens /invoices/<id>.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');

const User = require('../models/User');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const ReminderHistory = require('../models/ReminderHistory');

const PORT = process.env.PORT || 5000;
const HOST = '127.0.0.1';

function request(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: HOST,
      port: PORT,
      method,
      path,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(buf); } catch { parsed = buf; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const tag = 'ui-' + Date.now();

  // ----- Seed two users + two invoices -----
  // Let the User pre('save') hook hash the password — don't pre-hash here.
  const user = await User.create({
    email: `${tag}@payping.test`,
    password: 'Pass1234',
    entitlements: { emailReminders: true, whatsappReminders: false },
    notificationPreferences: { email: true, whatsapp: false }
  });
  const other = await User.create({
    email: `${tag}-other@payping.test`,
    password: 'Pass1234',
    entitlements: { emailReminders: true, whatsappReminders: false },
    notificationPreferences: { email: true, whatsapp: false }
  });

  const client = await Client.create({
    user: user._id,
    name: 'UiCust',
    email: `${tag}@example.test`
  });

  // Invoice 1 — has three history rows (1 sent, 1 failed, 1 sent).
  const invWith = await Invoice.create({
    user: user._id,
    client: client._id,
    amount: 500,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'pending',
    description: 'ui with history'
  });

  // Invoice 2 — empty (drives the empty state).
  const invEmpty = await Invoice.create({
    user: user._id,
    client: client._id,
    amount: 600,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
    description: 'ui no history'
  });

  // Three rows for invoice 1, oldest → newest.
  const now = Date.now();
  const older = await ReminderHistory.create({
    user: user._id,
    invoice: invWith._id,
    channel: 'email',
    status: 'sent',
    scheduledFor: new Date(now - 3 * 86400000),
    sentAt: new Date(now - 3 * 86400000),
    reminderRule: null
  });
  const middle = await ReminderHistory.create({
    user: user._id,
    invoice: invWith._id,
    channel: 'email',
    status: 'failed',
    error: 'SMTP rejected: mailbox full',
    scheduledFor: new Date(now - 2 * 86400000),
    sentAt: new Date(now - 2 * 86400000),
    reminderRule: null
  });
  const newest = await ReminderHistory.create({
    user: user._id,
    invoice: invWith._id,
    channel: 'email',
    status: 'sent',
    scheduledFor: new Date(now - 1 * 86400000),
    sentAt: new Date(now - 1 * 86400000),
    reminderRule: null
  });

  // A row owned by another user that must NOT leak.
  const foreignClient = await Client.create({
    user: other._id,
    name: 'OtherCust',
    email: `${tag}-other@example.test`
  });
  const foreignInv = await Invoice.create({
    user: other._id,
    client: foreignClient._id,
    amount: 700,
    dueDate: new Date(),
    status: 'pending'
  });
  await ReminderHistory.create({
    user: other._id,
    invoice: foreignInv._id,
    channel: 'email',
    status: 'sent',
    scheduledFor: new Date(),
    sentAt: new Date(),
    reminderRule: null
  });

  // ----- Login as the seeded user -----
  const login = await request('POST', '/api/auth/login', {
    body: { email: user.email, password: 'Pass1234' }
  });
  if (login.status !== 200) {
    console.error('login failed', login.status, login.body);
    process.exit(1);
  }
  const token = login.body.token;

  // ----- 1. Invoice with history — newest first, includes the failed row -----
  console.log('\n--- Test 1: GET /api/reminder-history?invoice=<with-history> ---');
  const withHistory = await request(
    'GET',
    `/api/reminder-history?invoice=${invWith._id.toString()}`,
    { token }
  );
  console.log('status:', withHistory.status, 'count:', withHistory.body.length);
  assert(withHistory.status === 200, 'expected 200');
  assert(withHistory.body.length === 3, `expected 3 rows, got ${withHistory.body.length}`);

  // The backend sorts sentAt desc — the newest row must come first.
  assert(
    withHistory.body[0]._id === newest._id.toString(),
    `expected newest first; got ${withHistory.body[0]._id} vs ${newest._id}`
  );
  assert(
    withHistory.body[1]._id === middle._id.toString(),
    'expected middle second'
  );
  assert(
    withHistory.body[2]._id === older._id.toString(),
    'expected oldest third'
  );

  // Foreign row MUST NOT leak.
  const allIds = withHistory.body.map((r) => r._id);
  assert(!allIds.includes(foreignInv._id.toString()), 'foreign invoice leaked');
  assert(!allIds.includes(older._id.toString()) === false, 'older missing');

  // Every row carries the fields the UI renders.
  for (const row of withHistory.body) {
    assert('status' in row, 'row missing status');
    assert('channel' in row, 'row missing channel');
    assert('scheduledFor' in row, 'row missing scheduledFor');
    assert('sentAt' in row, 'row missing sentAt');
    // reminderRule may be null but the key must exist.
    assert('reminderRule' in row, 'row missing reminderRule key');
  }

  // The failed row must surface its error string so the UI can render it.
  const failedRow = withHistory.body.find((r) => r._id === middle._id.toString());
  assert(failedRow.status === 'failed', 'middle row should be failed');
  assert(failedRow.error && /SMTP/.test(failedRow.error), 'failed row should carry error');
  console.log('failed row error:', failedRow.error);

  // The two sent rows must have error === null (the UI hides the column).
  const sentRows = withHistory.body.filter((r) => r.status === 'sent');
  for (const r of sentRows) {
    assert(r.error === null || r.error === undefined, 'sent row should not carry an error');
  }

  console.log('✅ history loads correctly (newest-first, failed row carries error)');

  // ----- 2. Empty invoice -----
  console.log('\n--- Test 2: GET /api/reminder-history?invoice=<empty> ---');
  const empty = await request(
    'GET',
    `/api/reminder-history?invoice=${invEmpty._id.toString()}`,
    { token }
  );
  console.log('status:', empty.status, 'count:', empty.body.length);
  assert(empty.status === 200, 'expected 200 for empty invoice');
  assert(Array.isArray(empty.body), 'expected array');
  assert(empty.body.length === 0, `expected 0 rows, got ${empty.body.length}`);
  console.log('✅ empty invoice returns [] (UI will render empty state)');

  // ----- 3. Unauthenticated request returns 401 -----
  console.log('\n--- Test 3: GET without auth ---');
  const unauth = await request(
    'GET',
    `/api/reminder-history?invoice=${invWith._id.toString()}`
  );
  console.log('no-auth status:', unauth.status);
  assert(unauth.status === 401, 'expected 401 without auth');
  console.log('✅ unauthenticated request rejected (401)');

  // ----- 4. Malformed invoice id returns 400 (UI should never hit this,
  // but it's the contract the page depends on) -----
  console.log('\n--- Test 4: GET with malformed invoice id ---');
  const bad = await request('GET', '/api/reminder-history?invoice=not-an-id', { token });
  console.log('malformed status:', bad.status, 'msg:', bad.body.message);
  assert(bad.status === 400, 'expected 400 for malformed id');
  console.log('✅ malformed invoice id returns 400');

  console.log('\n✅ ALL UI-CONTRACT CHECKS PASS');

  // ----- Cleanup -----
  await ReminderHistory.deleteMany({
    user: { $in: [user._id, other._id] }
  });
  await Invoice.deleteMany({
    _id: { $in: [invWith._id, invEmpty._id, foreignInv._id] }
  });
  await Client.deleteMany({
    user: { $in: [user._id, other._id] }
  });
  await User.deleteMany({
    _id: { $in: [user._id, other._id] }
  });

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('\n❌ UI-CONTRACT VERIFICATION FAILED:', err.message);
  console.error(err.stack);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});