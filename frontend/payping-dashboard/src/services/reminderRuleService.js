// Data layer for user-configurable reminder rules.
//
// This service is intentionally UI-agnostic so the future Reminder
// Scheduling page can plug straight into it without re-wiring the
// network calls. It is not yet imported anywhere in the dashboard —
// the Reminders page is left untouched in this phase per the Phase 4A
// brief.

import api from './api';

// GET /api/reminder-rules — list the current user's rules.
export async function listReminderRules() {
  const { data } = await api.get('/reminder-rules');
  return data;
}

// POST /api/reminder-rules — create a rule.
// `rule` may include: name, offsetDays, channel, enabled, repeat,
// repeatIntervalDays.
export async function createReminderRule(rule) {
  const { data } = await api.post('/reminder-rules', rule);
  return data;
}

// PATCH /api/reminder-rules/:id — update a rule (partial).
export async function updateReminderRule(id, updates) {
  const { data } = await api.patch(`/reminder-rules/${id}`, updates);
  return data;
}

// DELETE /api/reminder-rules/:id — delete a rule.
export async function deleteReminderRule(id) {
  const { data } = await api.delete(`/reminder-rules/${id}`);
  return data;
}