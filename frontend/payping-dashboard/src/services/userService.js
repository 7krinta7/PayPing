import api from './api';

// GET /api/user/me — fetch the current user's safe profile fields.
export async function getMe() {
  const { data } = await api.get('/user/me');
  return data;
}

// PATCH /api/user/profile — update only the fields allowed by the backend.
export async function updateProfile(updates) {
  const { data } = await api.patch('/user/profile', updates);
  return data;
}

// PATCH /api/user/password — change the authenticated user's password.
// Callers must keep the password values out of any persistent storage.
export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.patch('/user/password', { currentPassword, newPassword });
  return data;
}

// PATCH /api/user/notifications — update the user's notification preferences.
// Only the email preference is currently editable. The backend ignores
// any other fields.
export async function updateNotificationPreferences(updates) {
  const { data } = await api.patch('/user/notifications', updates);
  return data;
}
