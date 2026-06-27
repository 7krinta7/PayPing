// Data layer for reminder delivery history.
//
// Authentication is handled centrally by the api interceptor
// (Authorization: Bearer <token>).

import api from './api';

// GET /api/reminder-history — list the current user's history.
// Optional `params.invoice` scopes the result to a single invoice.
export async function listReminderHistory(params = {}) {
  const { data } = await api.get('/reminder-history', { params });
  return data;
}

// GET /api/reminder-history/:id — retrieve a single record.
export async function getReminderHistory(id) {
  const { data } = await api.get(`/reminder-history/${id}`);
  return data;
}

// GET /api/reminder-history/overview — dashboard overview counters.
// Returns { activeReminderRules, remindersSentToday, failedDeliveries, pendingInvoices }.
export async function getReminderOverview() {
  const { data } = await api.get('/reminder-history/overview');
  return data;
}

// GET /api/reminder-history/upcoming — preview of reminders the
// scheduler expects to fire next. Preview-only — does not send.
export async function getUpcomingReminders() {
  const { data } = await api.get('/reminder-history/upcoming');
  return data;
}