/**
 * errorMessage — Phase 9 MVP polish.
 *
 * Centralises the "Failed to load X" fallback that was duplicated in 14+
 * catch blocks across the app. Distinguishes:
 *   - Network errors (no response) — "Can't reach PayPing — check your connection"
 *   - 401 (token expired / invalid) — caller decides what to do
 *   - 403 — forbidden
 *   - 404 — not found
 *   - 5xx — server error
 *   - everything else — server message or fallback
 *
 * `formatApiError(err, fallback)` returns a friendly string.
 * `isUnauthorized(err)` is a separate predicate so callers can route
 * 401s to logout without re-running the same switch.
 *
 * No new design tokens. The strings here are user-facing copy only.
 */

export function isUnauthorized(err) {
  return Boolean(err && err.response && err.response.status === 401);
}

export function isNetworkError(err) {
  if (!err) return false;
  // axios sets `err.code === 'ERR_NETWORK'` when the request never
  // reached the server (DNS, offline, CORS preflight failure, etc.).
  if (err.code === 'ERR_NETWORK') return true;
  // Older axios / fetch fall-through: no response means the request
  // never produced one.
  if (!err.response && err.request) return true;
  return false;
}

export function formatApiError(err, fallback = 'Something went wrong') {
  if (!err) return fallback;

  if (isNetworkError(err)) {
    return "Can't reach PayPing — check your connection and try again.";
  }

  const status = err.response?.status;
  const serverMessage = err.response?.data?.message;

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return "You don't have permission to do that.";
  }
  if (status === 404) {
    return serverMessage || 'Not found.';
  }
  if (status >= 500) {
    return 'PayPing hit an unexpected error. Please try again in a moment.';
  }

  // 4xx with no server message — fall back to caller-supplied copy.
  if (serverMessage && typeof serverMessage === 'string') {
    return serverMessage;
  }

  return fallback;
}