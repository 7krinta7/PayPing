// Verify the GET /api/reminder-history endpoint against a running server.
// Seeds a user + 2 history records, then asserts:
//  - GET / returns the user's records sorted desc
//  - GET /?invoice=<id> filters to that invoice only
//  - GET /:id returns the single record
//  - GET /:id with another user's id returns 404 (auth scoping)
//  - GET / with malformed invoice id returns 400
//  - GET / without auth returns 401
//
// The script assumes the server is already running on PORT (default 5000).

require('dotenv').config();
const mongoose = require('mongoose');
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

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const tag = 'http-' + Date.now();
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
    name: 'HttpCust',
    email: `${tag}@example.test`
  });
  const inv1 = await Invoice.create({
    user: user._id,
    client: client._id,
    amount: 111,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
    description: 'http test 1'
  });
  const inv2 = await Invoice.create({
    user: user._id,
    client: client._id,
    amount: 222,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'pending',
    description: 'http test 2'
  });
  const rec1 = await ReminderHistory.create({
    user: user._id,
    invoice: inv1._id,
    channel: 'email',
    status: 'sent'
  });
  const rec2 = await ReminderHistory.create({
    user: user._id,
    invoice: inv2._id,
    channel: 'email',
    status: 'failed',
    error: 'simulated'
  });
  // Foreign record that should NOT be visible to this user.
  const foreignRec = await ReminderHistory.create({
    user: other._id,
    invoice: inv1._id,
    channel: 'email',
    status: 'sent'
  });

  // Mint a JWT by hitting /api/auth/login.
  const login = await request('POST', '/api/auth/login', {
    body: { email: user.email, password: 'Pass1234' }
  });
  if (login.status !== 200) {
    console.error('login failed', login.status, login.body);
    process.exit(1);
  }
  const token = login.body.token;

  // 1. Unauthenticated → 401
  const r401 = await request('GET', '/api/reminder-history');
  console.log('no-auth GET / =>', r401.status);
  if (r401.status !== 401) throw new Error('expected 401 without auth');

  // 2. GET / returns this user's 2 records (not the foreign one).
  const list = await request('GET', '/api/reminder-history', { token });
  console.log('list status:', list.status, 'count:', list.body.length);
  if (list.status !== 200) throw new Error('list status');
  if (list.body.length !== 2) throw new Error('list count: ' + list.body.length);
  const ids = list.body.map((r) => r._id).sort();
  if (ids.includes(foreignRec._id.toString())) throw new Error('foreign record leaked');
  if (!ids.includes(rec1._id.toString()) || !ids.includes(rec2._id.toString())) {
    throw new Error('user records missing');
  }
  // Sorted desc by sentAt/createdAt — rec2 is newer-ish (created after rec1).
  if (list.body[0]._id !== rec2._id.toString()) {
    throw new Error('expected rec2 first (newest)');
  }

  // 3. GET /?invoice=<inv1>
  const filtered = await request(
    'GET',
    `/api/reminder-history?invoice=${inv1._id.toString()}`,
    { token }
  );
  console.log('filtered count:', filtered.body.length);
  if (filtered.body.length !== 1) throw new Error('filter should return 1');
  if (filtered.body[0]._id !== rec1._id.toString()) throw new Error('filter returned wrong record');

  // 4. GET /?invoice=<malformed>
  const bad = await request('GET', '/api/reminder-history?invoice=not-an-id', { token });
  console.log('malformed invoice =>', bad.status, bad.body.message);
  if (bad.status !== 400) throw new Error('expected 400 for bad id');

  // 5. GET /:id of own record
  const one = await request('GET', `/api/reminder-history/${rec1._id}`, { token });
  console.log('GET /:id status:', one.status);
  if (one.status !== 200) throw new Error('get one status');
  if (one.body._id !== rec1._id.toString()) throw new Error('get one id');

  // 6. GET /:id of foreign record → 404 (auth scoping)
  const foreign = await request('GET', `/api/reminder-history/${foreignRec._id}`, { token });
  console.log('foreign GET /:id =>', foreign.status);
  if (foreign.status !== 404) throw new Error('expected 404 for foreign record');

  // 7. GET /:id malformed → 400
  const badId = await request('GET', '/api/reminder-history/not-an-id', { token });
  console.log('malformed /:id =>', badId.status);
  if (badId.status !== 400) throw new Error('expected 400 for bad /:id');

  console.log('\n✅ HTTP verification: ALL CHECKS PASS');

  // Cleanup
  await ReminderHistory.deleteMany({ user: { $in: [user._id, other._id] } });
  await Invoice.deleteMany({ user: { $in: [user._id, other._id] } });
  await Client.deleteMany({ user: { $in: [user._id, other._id] } });
  await User.deleteMany({ _id: { $in: [user._id, other._id] } });

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('❌ HTTP verification FAILED:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
