// localStorage helpers for the JWT.
// Centralized so the storage backend (localStorage vs httpOnly cookie) can be swapped later.

const STORAGE_KEY = 'payping_token';

export function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in private modes or sandboxed iframes.
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
