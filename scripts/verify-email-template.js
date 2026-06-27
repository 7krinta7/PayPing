// Verify the Phase 7 Email Template feature end-to-end against a
// running server on port 5050.
//
// Coverage:
//   [1]  Unauth GET -> 401
//   [2]  Unauth PATCH -> 401
//   [3]  Register a fresh user
//   [4]  Initial GET -> defaults, isCustomised=false
//   [5]  PATCH custom template
//   [6]  GET re-reads the saved template
//   [7]  PATCH with body too long -> 400
//   [8]  PATCH with subject too long -> 400
//   [9]  PATCH with non-string subject -> 400
//   [10] PATCH with empty strings clears customisation
//   [11] Re-PATCH restores custom
//   [12] Variables list contains the 5 expected names
//   [13] Set businessName via PATCH /api/user/profile
//   [14] Create a client
//   [15] Create an invoice
//   [16] Render the user's template against the populated invoice
//        through the same renderer the scheduler uses
//   [17] Verify no raw {{...}} placeholders remain in the rendered text

const http = require('http');

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

const base = { host: '127.0.0.1', port: 5050 };

(async () => {
  // 1) Unauthenticated GET should 401.
  let r = await req({ ...base, path: '/api/email-template', method: 'GET' });
  console.log('[1] Unauth GET:', r.status);

  // 2) Unauthenticated PATCH should 401.
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ subject: 'x' }));
  console.log('[2] Unauth PATCH:', r.status);

  // 3) Register a fresh test user.
  const email = 'verify-tpl-' + Date.now() + '@payping.test';
  const password = 'TestPass1234';
  r = await req({ ...base, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ email, password }));
  console.log('[3] Register:', r.status, '|', r.body.slice(0, 80));
  const { token } = JSON.parse(r.body);

  // 4) GET template as new user — should return DEFAULT template.
  r = await req({ ...base, path: '/api/email-template', method: 'GET', headers: { Authorization: 'Bearer ' + token } });
  const initial = JSON.parse(r.body);
  console.log('[4] Initial GET status:', r.status, '| subject:', initial.subject, '| isCustomised:', initial.isCustomised, '| vars:', initial.variables.length);

  // 5) PATCH with custom template.
  const custom = {
    subject: 'Heads up {{clientName}} from {{businessName}}',
    body: 'Hi {{clientName}},\n\nInvoice {{invoiceAmount}} is due on {{dueDate}}.\n\n{{invoiceDescription}}\n\nThanks,\n{{businessName}}'
  };
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify(custom));
  const saved = JSON.parse(r.body);
  console.log('[5] PATCH status:', r.status, '| isCustomised:', saved.isCustomised);

  // 6) GET again — should return the saved values.
  r = await req({ ...base, path: '/api/email-template', method: 'GET', headers: { Authorization: 'Bearer ' + token } });
  const reread = JSON.parse(r.body);
  console.log('[6] Re-read subject matches:', reread.subject === custom.subject, '| body matches:', reread.body === custom.body);

  // 7) PATCH with body too long should 400.
  const huge = 'x'.repeat(5001);
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ body: huge }));
  console.log('[7] Body too long:', r.status, '|', r.body.slice(0, 120));

  // 8) PATCH with subject too long should 400.
  const hugeSubj = 'y'.repeat(201);
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ subject: hugeSubj }));
  console.log('[8] Subject too long:', r.status);

  // 9) PATCH with non-string subject should 400.
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ subject: 12345 }));
  console.log('[9] Non-string subject:', r.status);

  // 10) Empty string PATCH clears customisation (uses defaults).
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ subject: '', body: '' }));
  const cleared = JSON.parse(r.body);
  console.log('[10] Cleared PATCH: status:', r.status, '| isCustomised:', cleared.isCustomised, '| default subject:', cleared.subject);

  // 11) Restore custom for next step.
  r = await req({ ...base, path: '/api/email-template', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify(custom));
  console.log('[11] Re-PATCH restored: status:', r.status);

  // 12) Variables list contains the expected 5 vars.
  r = await req({ ...base, path: '/api/email-template', method: 'GET', headers: { Authorization: 'Bearer ' + token } });
  const vars = JSON.parse(r.body).variables;
  const expected = ['businessName', 'clientName', 'invoiceAmount', 'dueDate', 'invoiceDescription'];
  console.log('[12] Variables:', JSON.stringify(vars), '| matches expected:', JSON.stringify(vars) === JSON.stringify(expected));

  // 13) Update profile so businessName is set.
  r = await req({ ...base, path: '/api/user/profile', method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ businessName: 'Acme Studios' }));
  console.log('[13] Profile PATCH:', r.status);

  // 14) Create a client.
  r = await req({ ...base, path: '/api/clients', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ name: 'Priya Sharma', email: 'priya@example.com' }));
  const client = JSON.parse(r.body);
  console.log('[14] Create client:', r.status, client._id);

  // 15) Create an invoice.
  r = await req({ ...base, path: '/api/invoices', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } }, JSON.stringify({ client: client._id, amount: 12500, dueDate: '2026-07-01', description: 'Website redesign — June' }));
  const invoice = JSON.parse(r.body);
  console.log('[15] Create invoice:', r.status, invoice._id);

  // 16) Render the user's template against the populated invoice
  //     through the same renderer the scheduler uses.
  const { renderForUser } = require('../utils/emailTemplate');
  const User = require('../models/User');
  const Invoice = require('../models/Invoice');
  const u = await User.findOne({ email });
  const inv = await Invoice.findById(invoice._id).populate('client', 'name email');
  const rendered = renderForUser(u, inv);
  console.log('[16] Scheduler render:');
  console.log('     Subject:', rendered.subject);
  console.log('     Body:');
  console.log(rendered.body.split('\n').map((l) => '       ' + l).join('\n'));

  // 17) Verify no raw placeholders remain.
  console.log('[17] No raw placeholders in subject:', !rendered.subject.includes('{{'), '| in body:', !rendered.body.includes('{{'));

  // 18) Unknown variables stay unchanged (use a template with a typo).
  await User.updateOne({ email }, { 'emailTemplate.body': 'Hi {{clientNme}} (typo) — {{clientName}}' });
  const u2 = await User.findOne({ email });
  const rendered2 = renderForUser(u2, inv);
  console.log('[18] Unknown var preserved:', rendered2.body.includes('{{clientNme}}'), '| known var replaced:', !rendered2.body.includes('{{clientName}}'));

  // 19) Default behaviour for a user with no stored template (simulate
  //     by wiping emailTemplate fields). Use direct DB update so the
  //     pre('save') middleware doesn't re-hash a still-current password.
  await User.updateOne({ email }, { $unset: { 'emailTemplate.subject': '', 'emailTemplate.body': '' } });
  const u3 = await User.findOne({ email });
  const rendered3 = renderForUser(u3, inv);
  console.log('[19] Default template used when empty:');
  console.log('     Subject:', rendered3.subject);
  console.log('     Body includes businessName:', rendered3.body.includes('Acme Studios'), '| includes clientName:', rendered3.body.includes('Priya Sharma'));

  console.log('\nAll checks completed.');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
