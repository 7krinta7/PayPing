import { useEffect, useState } from 'react';
import { changePassword } from '../../services/userService';
import { formatApiError } from '../../utils/errorMessage';
import './ChangePasswordDialog.css';

// Minimum password length, matching the backend and the registration form.
const MIN_PASSWORD_LENGTH = 8;

/**
 * ChangePasswordDialog — modal for changing the current user's password.
 *
 * Reuses the same backdrop/dialog shell as ConfirmDialog so the visual
 * language stays consistent across the app. Passwords live in component
 * state only and are wiped on close / success / unmount — they are never
 * written to localStorage or any persistent store.
 *
 * On a successful password update the parent is notified via
 * `onSuccess()`; the modal then closes itself and clears its fields.
 */
export default function ChangePasswordDialog({ open, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset all fields every time the dialog is reopened or closed so
  // stale passwords never linger in the DOM after the modal closes.
  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      setSubmitting(false);
    }
  }, [open]);

  // ESC closes the dialog when not in the middle of a request.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Client-side validation mirrors the backend's minimum-length rule
    // and adds the "must match" check that the backend cannot perform
    // (the API only sees one new-password value).
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setSubmitting(true);
      await changePassword({ currentPassword, newPassword });
      // Brief success message, then close.
      setSuccess('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Give the user a beat to see the confirmation, then close.
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdrop = () => {
    if (!submitting) onClose();
  };

  return (
    <div
      className="confirm-dialog-backdrop"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className="confirm-dialog change-password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="change-password-title" className="confirm-dialog-title">
          Change password
        </h2>
        <p className="confirm-dialog-message">
          Enter your current password and a new password of at least {MIN_PASSWORD_LENGTH} characters.
        </p>

        <form className="change-password-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert alert-error change-password-alert" role="alert">
              {error}
            </div>
          )}
          {success && !error && (
            <div
              className="alert alert-success change-password-alert"
              role="status"
            >
              {success}
            </div>
          )}

          <label className="change-password-field">
            <span className="change-password-label">Current password</span>
            <input
              type="password"
              className="settings-text-input"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </label>

          <label className="change-password-field">
            <span className="change-password-label">New password</span>
            <input
              type="password"
              className="settings-text-input"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={submitting}
            />
          </label>

          <label className="change-password-field">
            <span className="change-password-label">Confirm new password</span>
            <input
              type="password"
              className="settings-text-input"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={submitting}
            />
          </label>

          <div className="confirm-dialog-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}