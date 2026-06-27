import api from './api';

// GET /api/email-template — fetch the current user's stored email
// template. The response also returns the list of supported variables
// and the default subject / body so the Settings UI can refresh both
// the editor and the "Reset to Default" preview in a single round-trip.
export async function getEmailTemplate() {
  const { data } = await api.get('/email-template');
  return data;
}

// PATCH /api/email-template — save the current user's reminder email
// template. Pass `subject` and/or `body`; missing fields are left
// unchanged on the server. An empty string clears the customisation so
// the scheduler falls back to the default template.
export async function updateEmailTemplate({ subject, body } = {}) {
  const payload = {};
  if (subject !== undefined) payload.subject = subject;
  if (body !== undefined) payload.body = body;
  const { data } = await api.patch('/email-template', payload);
  return data;
}

// POST /api/email-template/test — send a preview email to the
// authenticated user's own email address. The server renders the
// provided (or stored) template and emails it. No ReminderHistory,
// Invoice, or ReminderRule record is created — this is a standalone
// preview only.
export async function sendTestEmail({ subject, body } = {}) {
  const payload = {};
  if (subject !== undefined) payload.subject = subject;
  if (body !== undefined) payload.body = body;
  const { data } = await api.post('/email-template/test', payload);
  return data;
}