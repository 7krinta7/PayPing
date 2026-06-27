import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

/**
 * ConfirmDialog — modal confirm/cancel dialog used for every destructive
 * action in the app (delete client / invoice / rule, mark paid).
 *
 * Phase 9 polish:
 *   - ESC closes the dialog when not busy.
 *   - Cancel button auto-focuses on mount so Enter dismisses safely
 *     (a destructive confirm should never be the default action).
 *   - Click on backdrop closes when not busy (unchanged).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  // ESC handler — same pattern ChangePasswordDialog uses so the two
  // modal surfaces agree on keyboard behaviour.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onCancel?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  // Auto-focus the cancel button on open. The cancel button is the
  // safe default — Enter should dismiss, not confirm a destructive
  // action. Users can still tab to the confirm button to proceed.
  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-backdrop"
      onClick={busy ? undefined : onCancel}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">{title}</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={busy}
            ref={cancelRef}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}