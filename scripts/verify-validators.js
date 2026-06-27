// Verifies the express-validator + validate.js wiring for every route
// that has a validator. Mounts each route group on a tiny express app,
// POSTs an invalid payload, and asserts:
//   - status 400
//   - response body is `{ message }`
//   - message references the offending field name
//
// Also confirms a happy-path payload passes through (no validation error).

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const authValidators = require('../middleware/validators/authValidators');
const clientValidators = require('../middleware/validators/clientValidators');
const invoiceValidators = require('../middleware/validators/invoiceValidators');
const reminderRuleValidators = require('../middleware/validators/reminderRuleValidators');
const userValidators = require('../middleware/validators/userValidators');

const http = require('http');

function request(server, method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const port = server.address().port;
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1', port, path, method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } : headers,
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => chunks += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : {} }); }
          catch (_) { resolve({ status: res.statusCode, body: chunks }); }
        });
      }
    );
    req.setTimeout(5000, () => {
      req.destroy(new Error('socket timeout'));
      resolve({ status: 0, body: { error: 'timeout' } });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

function check(label, ok, detail) {
  if (ok) console.log('  ✅ ' + label);
  else { console.log('  ❌ ' + label + ' — ' + detail); process.exitCode = 1; }
}

(async () => {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Routes that should 400 on bad input.
  app.post('/auth/register', authValidators.registerRules, validate, (_req, res) => res.json({ ok: true }));
  app.post('/auth/login', authValidators.loginRules, validate, (_req, res) => res.json({ ok: true }));
  app.post('/clients', clientValidators.createRules, validate, (_req, res) => res.json({ ok: true }));
  app.patch('/clients/:id', clientValidators.updateRules, validate, (_req, res) => res.json({ ok: true }));
  app.post('/invoices', invoiceValidators.createRules, validate, (_req, res) => res.json({ ok: true }));
  app.patch('/invoices/:id', invoiceValidators.updateRules, validate, (_req, res) => res.json({ ok: true }));
  app.post('/reminder-rules', reminderRuleValidators.createRules, validate, (_req, res) => res.json({ ok: true }));
  app.patch('/reminder-rules/:id', reminderRuleValidators.updateRules, validate, (_req, res) => res.json({ ok: true }));
  app.patch('/me/profile', userValidators.profileRules, validate, (_req, res) => res.json({ ok: true }));
  app.patch('/me/password', userValidators.passwordRules, validate, (_req, res) => res.json({ ok: true }));
  app.patch('/me/notifications', userValidators.notificationsRules, validate, (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((r) => server.on('listening', r));

  // ------------ auth/register ------------
  console.log('\n--- POST /auth/register ---');
  let r = await request(server, 'POST', '/auth/register', {});
  check('status 400 on empty', r.status === 400, 'got ' + r.status);
  check('message mentions email', /email/i.test(r.body.message), JSON.stringify(r.body));
  r = await request(server, 'POST', '/auth/register', { email: 'not-an-email', password: 'x' });
  check('status 400 on bad email', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/auth/register', { email: 'good@test.com', password: 'shortpw' });
  check('status 400 on short pw', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/auth/register', { email: 'good@test.com', password: 'longenough' });
  check('status 200 on valid', r.status === 200, 'got ' + r.status);

  // ------------ auth/login ------------
  console.log('\n--- POST /auth/login ---');
  r = await request(server, 'POST', '/auth/login', {});
  check('status 400 on empty', r.status === 400, 'got ' + r.status);

  // ------------ clients ------------
  console.log('\n--- POST /clients ---');
  r = await request(server, 'POST', '/clients', {});
  check('status 400 missing name', r.status === 400, 'got ' + r.status);
  check('message mentions name', /name/i.test(r.body.message), JSON.stringify(r.body));
  r = await request(server, 'POST', '/clients', { name: 'A', email: 'not-an-email' });
  check('status 400 bad email', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/clients', { name: 'A' });
  check('status 200 valid', r.status === 200, 'got ' + r.status);

  console.log('\n--- PATCH /clients/:id ---');
  r = await request(server, 'PATCH', '/clients/1', { email: 'not-an-email' });
  check('status 400 bad email on patch', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/clients/1', {});
  check('status 200 empty patch', r.status === 200, 'got ' + r.status);

  // ------------ invoices ------------
  console.log('\n--- POST /invoices ---');
  r = await request(server, 'POST', '/invoices', {});
  check('status 400 missing fields', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/invoices', { client: 'not-an-objectid', amount: 1, dueDate: new Date().toISOString() });
  check('status 400 bad client id', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/invoices', { client: new mongoose.Types.ObjectId().toString(), amount: -5, dueDate: new Date().toISOString() });
  check('status 400 amount <= 0', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/invoices', { client: new mongoose.Types.ObjectId().toString(), amount: 10, dueDate: 'not-a-date' });
  check('status 400 bad dueDate', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/invoices', {
    client: new mongoose.Types.ObjectId().toString(),
    amount: 10,
    dueDate: new Date().toISOString(),
  });
  check('status 200 valid invoice', r.status === 200, 'got ' + r.status);

  console.log('\n--- PATCH /invoices/:id ---');
  r = await request(server, 'PATCH', '/invoices/1', { amount: 0 });
  check('status 400 amount=0', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/invoices/1', { client: 'bad' });
  check('status 400 bad client', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/invoices/1', { amount: 5 });
  check('status 200 valid amount', r.status === 200, 'got ' + r.status);

  // ------------ reminder rules ------------
  console.log('\n--- POST /reminder-rules ---');
  r = await request(server, 'POST', '/reminder-rules', {});
  check('status 400 missing offsetDays', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/reminder-rules', { offsetDays: 'abc' });
  check('status 400 offsetDays non-int', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/reminder-rules', { offsetDays: -1000 });
  check('status 400 offsetDays out of range', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/reminder-rules', { offsetDays: 1, channel: 'telegram' });
  check('status 400 bad channel', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/reminder-rules', { offsetDays: 1, repeatIntervalDays: 9999 });
  check('status 400 repeat too large', r.status === 400, 'got ' + r.status);
  r = await request(server, 'POST', '/reminder-rules', { offsetDays: 1 });
  check('status 200 minimal valid', r.status === 200, 'got ' + r.status);

  console.log('\n--- PATCH /reminder-rules/:id ---');
  r = await request(server, 'PATCH', '/reminder-rules/1', { enabled: 'yes' });
  check('status 400 enabled not boolean', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/reminder-rules/1', {});
  check('status 200 empty patch', r.status === 200, 'got ' + r.status);

  // ------------ user ------------
  console.log('\n--- PATCH /me/profile ---');
  r = await request(server, 'PATCH', '/me/profile', { email: 'x@x.com' });
  check('status 400 disallowed email field', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/me/profile', { businessName: 'a'.repeat(121) });
  check('status 400 businessName too long', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/me/profile', { businessName: 'Acme' });
  check('status 200 valid', r.status === 200, 'got ' + r.status);

  console.log('\n--- PATCH /me/password ---');
  r = await request(server, 'PATCH', '/me/password', {});
  check('status 400 missing fields', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/me/password', { currentPassword: 'a', newPassword: 'short' });
  check('status 400 short new password', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/me/password', { currentPassword: 'a', newPassword: 'longenough' });
  check('status 200 valid', r.status === 200, 'got ' + r.status);

  console.log('\n--- PATCH /me/notifications ---');
  r = await request(server, 'PATCH', '/me/notifications', { email: 'yes' });
  check('status 400 email not boolean', r.status === 400, 'got ' + r.status);
  r = await request(server, 'PATCH', '/me/notifications', { email: false });
  check('status 200 valid', r.status === 200, 'got ' + r.status);

  server.close();
  if (process.exitCode) console.log('\n❌ some validator checks failed');
  else console.log('\n✅ all validator checks passed');
})();