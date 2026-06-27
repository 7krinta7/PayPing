import { useEffect, useMemo, useState } from 'react';
import {
  getEmailTemplate,
  updateEmailTemplate,
  sendTestEmail
} from '../../services/emailTemplateService';
import {
  EMAIL_TEMPLATE_VARS,
  SAMPLE_VALUES,
  renderTemplate
} from '../../utils/emailTemplate';
import { formatApiError } from '../../utils/errorMessage';
import './EmailTemplateCard.css';

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

/**
 * EmailTemplateCard — Settings card for the user-customisable reminder
 * email template.
 *
 * Behaviour:
 *   - On mount, fetches the stored template (GET /api/email-template)
 *     and seeds the local editor with the returned subject + body.
 *   - "Live Preview" renders the current draft against locally-generated
 *     sample values on every keystroke. The sample values are never sent
 *     to the server; preview state lives only in component memory.
 *   - "Save" patches the template (PATCH /api/email-template).
 *   - "Send Test Email" delivers the current draft — including unsaved
 *     edits — to the authenticated user's own email address. No
 *     ReminderHistory row is created; this is a standalone preview only.
 *   - "Reset to Default" replaces the editor with the defaults returned
 *     by GET /api/email-template so the change only becomes active once
 *     the user clicks Save.
 *
 * The card reuses the same .settings-card / .settings-card-header
 * scaffolding that Profile and Notification Preferences live in, so
 * the Settings page reads as a single vertical column of cards.
 */
export default function EmailTemplateCard() {
  const [defaults, setDefaults] = useState({ subject: '', body: '' });
  const [variables, setVariables] = useState(EMAIL_TEMPLATE_VARS);

  // The "stored" snapshot — last value the server returned. Used to
  // compute isDirty (draft vs server) and to recover after a Reset.
  const [stored, setStored] = useState({ subject: '', body: '' });
  // The user's current draft. Edited locally; only flushed on Save.
  const [draft, setDraft] = useState({ subject: '', body: '' });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError('');
        const data = await getEmailTemplate();
        if (cancelled) return;
        const next = {
          subject: data?.subject || '',
          body: data?.body || ''
        };
        setDefaults({
          subject: data?.defaults?.subject || '',
          body: data?.defaults?.body || ''
        });
        if (Array.isArray(data?.variables) && data.variables.length) {
          setVariables(data.variables);
        }
        setStored(next);
        setDraft(next);
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, 'Failed to load email template'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // The draft only counts as "dirty" when at least one field actually
  // differs from the server snapshot. Whitespace-only changes still
  // count because users often trim trailing whitespace intentionally.
  const isDirty = draft.subject !== stored.subject || draft.body !== stored.body;
  const canSave = !loading && !saving && isDirty;
  const canTest = !loading && !saving && !testing;

  const handleSubjectChange = (e) => {
    setDraft((prev) => ({ ...prev, subject: e.target.value }));
    setError('');
    setMessage('');
    setTestMessage('');
  };

  const handleBodyChange = (e) => {
    setDraft((prev) => ({ ...prev, body: e.target.value }));
    setError('');
    setMessage('');
    setTestMessage('');
  };

  const handleReset = () => {
    setError('');
    setMessage('');
    setTestMessage('');
    setDraft({ subject: defaults.subject, body: defaults.body });
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!canSave) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');
      setTestMessage('');
      const data = await updateEmailTemplate({
        subject: draft.subject,
        body: draft.body
      });
      const next = {
        subject: data?.subject ?? draft.subject,
        body: data?.body ?? draft.body
      };
      setStored(next);
      setDraft(next);
      setMessage('Email template saved.');
    } catch (err) {
      setError(formatApiError(err, 'Failed to save email template'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Send the current draft (including unsaved edits) to the
   * authenticated user's own email address via the test endpoint.
   * The server renders with sample values and uses the existing
   * sendEmail transport — no ReminderHistory is created.
   */
  const handleSendTest = async () => {
    if (!canTest) return;
    try {
      setTesting(true);
      setError('');
      setMessage('');
      setTestMessage('');
      const data = await sendTestEmail({
        subject: draft.subject,
        body: draft.body
      });
      const recipient = data?.sentTo || 'your email address';
      setTestMessage(
        `Test email sent to ${recipient}. Check your inbox (and spam folder) to review how PayPing will deliver reminders.`
      );
    } catch (err) {
      setError(formatApiError(err, 'Failed to send test email'));
    } finally {
      setTesting(false);
    }
  };

  // Live preview — re-renders on every keystroke. Sample values are
  // generated locally so the network is never involved.
  const previewSubject = useMemo(
    () => renderTemplate(draft.subject || '', SAMPLE_VALUES),
    [draft.subject]
  );
  const previewBody = useMemo(
    () => renderTemplate(draft.body || '', SAMPLE_VALUES),
    [draft.body]
  );

  const footerHelper = loading
    ? 'Loading template…'
    : saving
      ? 'Saving…'
      : testing
        ? 'Sending test email…'
        : message
          ? message
          : error
            ? error
            : isDirty
              ? 'You have unsaved changes.'
              : 'Template is up to date.';

  return (
    <section className="settings-card" aria-labelledby="settings-email-template-title">
      <header className="settings-card-header">
        <h2 id="settings-email-template-title" className="settings-card-title">
          Email Template
        </h2>
        <p className="settings-card-subtitle">
          Customise the reminder email PayPing sends on your behalf.
        </p>
      </header>

      <form className="settings-card-body email-template-card-body" onSubmit={handleSave}>
        {error && (
          <div className="alert alert-error email-template-alert" role="alert">
            {error}
          </div>
        )}
        {message && !error && (
          <div className="alert alert-success email-template-alert" role="status">
            {message}
          </div>
        )}
        {testMessage && !error && (
          <div className="alert alert-success email-template-alert" role="status">
            {testMessage}
          </div>
        )}

        <div className="email-template-editor">
          <div className="email-template-fields">
            <div className="settings-row-stacked">
              <label
                htmlFor="settings-email-template-subject"
                className="settings-row-label-text"
              >
                Subject
              </label>
              <input
                id="settings-email-template-subject"
                type="text"
                className="settings-text-input"
                value={loading ? '' : draft.subject}
                onChange={handleSubjectChange}
                disabled={loading || saving}
                maxLength={200}
                placeholder="Payment Reminder"
                aria-describedby="settings-email-template-subject-helper"
              />
              <p
                id="settings-email-template-subject-helper"
                className="settings-row-helper settings-row-helper-muted"
              >
                The subject line of every reminder email.
              </p>
            </div>

            <div className="settings-row-stacked">
              <label
                htmlFor="settings-email-template-body"
                className="settings-row-label-text"
              >
                Body
              </label>
              <textarea
                id="settings-email-template-body"
                className="settings-text-input email-template-body-input"
                value={loading ? '' : draft.body}
                onChange={handleBodyChange}
                disabled={loading || saving}
                rows={10}
                placeholder="Hi {{clientName}}, this is a reminder…"
                aria-describedby="settings-email-template-body-helper"
              />
              <p
                id="settings-email-template-body-helper"
                className="settings-row-helper settings-row-helper-muted"
              >
                Use the variables below — unknown placeholders stay in the email unchanged.
              </p>
            </div>

            <div className="settings-card-footer-actions email-template-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={loading || saving || testing}
              >
                Reset to Default
              </button>
              <button
                type="button"
                className="btn btn-secondary email-template-test-btn"
                onClick={handleSendTest}
                disabled={!canTest}
                aria-disabled={!canTest}
                title="Send the current draft to your own email — no invoice or history is created"
              >
                <span className="email-template-test-icon" aria-hidden="true">
                  {MAIL_ICON}
                </span>
                {testing ? 'Sending…' : 'Send Test Email'}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSave}
                aria-disabled={!canSave}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <aside className="email-template-sidebar" aria-label="Available variables">
            <p className="email-template-sidebar-title">Available variables</p>
            <ul className="email-template-var-list">
              {variables.map((name) => (
                <li key={name} className="email-template-var-item">
                  <code className="email-template-var-token">{`{{${name}}}`}</code>
                  <span className="email-template-var-desc">
                    {VARIABLE_HINTS[name] || ''}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Live preview — always visible, updates on every keystroke.
            Sample values are local; nothing is sent or saved. */}
        <section
          className="email-template-preview"
          aria-label="Live preview of the reminder email"
        >
          <header className="email-template-preview-header">
            <p className="email-template-preview-eyebrow">Live Preview</p>
            <p className="email-template-preview-helper">
              Updates as you type — rendered with sample values, never saved.
            </p>
          </header>
          <div className="email-template-preview-meta">
            <span className="email-template-preview-label">Subject</span>
            <p className="email-template-preview-subject">
              {previewSubject || <span className="email-template-preview-empty">—</span>}
            </p>
          </div>
          <div className="email-template-preview-meta">
            <span className="email-template-preview-label">Body</span>
            <pre className="email-template-preview-body">
              {previewBody || <span className="email-template-preview-empty">—</span>}
            </pre>
          </div>
        </section>

        <footer className="settings-card-footer">
          <p className="settings-card-footer-helper" aria-live="polite">
            {footerHelper}
          </p>
        </footer>
      </form>
    </section>
  );
}

// Short, user-friendly description for each supported variable. Lives
// at module scope so the component itself stays focused on rendering.
const VARIABLE_HINTS = {
  businessName: 'Your business name',
  clientName: 'The recipient client name',
  invoiceAmount: 'Invoice amount',
  dueDate: 'Invoice due date',
  invoiceDescription: 'Invoice description'
};