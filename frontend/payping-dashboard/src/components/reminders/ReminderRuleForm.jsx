import { useEffect, useState } from 'react';
import './ReminderRuleForm.css';

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const NAME_MAX = 120;
const DAYS_MIN = 1;
const DAYS_MAX = 365;

/**
 * ToggleSwitch — local copy of the InvoiceForm toggle so the file
 * stays self-contained and styles remain scoped.
 */
function ToggleSwitch({ checked, disabled = false, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`reminder-rule-form-toggle${checked ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <span className="reminder-rule-form-toggle-knob" aria-hidden="true" />
    </button>
  );
}

/**
 * Derive the segmented-timing state from an `offsetDays` value:
 *   < 0 → 'before'
 *   = 0 → 'on'
 *   > 0 → 'after'
 */
function deriveTiming(offsetDays) {
  const n = Number(offsetDays);
  if (!Number.isFinite(n) || n === 0) return 'on';
  return n < 0 ? 'before' : 'after';
}

/**
 * Derive the positive days count from an `offsetDays` value. Returns
 * an empty string when offsetDays is 0 so the placeholder shows.
 */
function deriveDays(offsetDays) {
  const n = Number(offsetDays);
  if (!Number.isFinite(n) || n === 0) return '';
  return String(Math.abs(n));
}

/**
 * ReminderRuleForm — create / edit reminder rule.
 *
 * Modes:
 *   - 'create' → starts with blank values, "Create Rule" submit label.
 *   - 'edit'   → starts from `initialValues`, "Save Changes" label.
 *
 * The UI never shows a negative number; the user picks a timing
 * segment (Before / On / After) and a positive `days` count. Submit
 * converts timing × days to the signed `offsetDays` the backend stores.
 *
 * Channel is fixed to 'email' for this phase (per the brief). WhatsApp
 * is intentionally not surfaced: the rule scheduler currently records
 * non-email rules as `failed`, so presenting the option as available
 * would be misleading.
 */
export default function ReminderRuleForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  mode = 'create', // 'create' | 'edit'
}) {
  const isEdit = mode === 'edit';

  const [name, setName] = useState(
    typeof initialValues?.name === 'string' ? initialValues.name : ''
  );
  const [timing, setTiming] = useState(() => deriveTiming(initialValues?.offsetDays));
  const [days, setDays] = useState(() => deriveDays(initialValues?.offsetDays));
  const [enabled, setEnabled] = useState(
    initialValues?.enabled !== undefined ? Boolean(initialValues.enabled) : true
  );
  const [error, setError] = useState('');

  // Reset whenever the parent swaps to a different `initialValues`
  // reference (e.g. parent opens edit on a different rule).
  useEffect(() => {
    setName(typeof initialValues?.name === 'string' ? initialValues.name : '');
    setTiming(deriveTiming(initialValues?.offsetDays));
    setDays(deriveDays(initialValues?.offsetDays));
    setEnabled(initialValues?.enabled !== undefined ? Boolean(initialValues.enabled) : true);
    setError('');
  }, [initialValues]);

  const validate = () => {
    if (name.length > NAME_MAX) {
      return `Rule name is too long (max ${NAME_MAX} characters)`;
    }
    if (timing !== 'on') {
      const n = Number(days);
      if (days === '' || !Number.isFinite(n) || !Number.isInteger(n)) {
        return 'Days must be a whole number';
      }
      if (n < DAYS_MIN || n > DAYS_MAX) {
        return `Days must be between ${DAYS_MIN} and ${DAYS_MAX}`;
      }
    }
    return '';
  };

  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedName = name.trim();
    let offsetDays;
    if (timing === 'before') offsetDays = -Number(days);
    else if (timing === 'after') offsetDays = Number(days);
    else offsetDays = 0;

    const payload = {
      name: trimmedName,
      offsetDays,
      channel: 'email',
      enabled,
    };

    onSubmit(payload);
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (error) setError('');
  };

  const handleDaysChange = (e) => {
    setDays(e.target.value);
    if (error) setError('');
  };

  const handleTimingChange = (next) => {
    setTiming(next);
    if (error) setError('');
  };

  const handleCancel = () => {
    setName('');
    setTiming('on');
    setDays('');
    setEnabled(true);
    setError('');
    onCancel();
  };

  const title = isEdit ? 'Edit Reminder Rule' : 'Create Reminder Rule';
  const subtitle = isEdit
    ? 'Adjust when this reminder fires for an invoice.'
    : 'Define when PayPing should email a client about a pending invoice.';
  const submitLabel = isEdit
    ? (submitting ? 'Saving…' : 'Save Changes')
    : (submitting ? 'Creating…' : 'Create Rule');

  const daysDisabled = timing === 'on';

  return (
    <div className="reminder-rule-form-page">
      <header className="reminder-rule-form-header">
        <div className="reminder-rule-form-header-text">
          <p className="reminder-rule-form-eyebrow">Workspace</p>
          <h1 className="reminder-rule-form-title">{title}</h1>
          <p className="reminder-rule-form-subtitle">{subtitle}</p>
        </div>
      </header>

      <form className="reminder-rule-form-card-form" onSubmit={handleSubmit} noValidate>
        <div className="reminder-rule-form-card">
          <section className="reminder-rule-form-section">
            <header className="reminder-rule-form-section-header">
              <h2 className="reminder-rule-form-section-title">Rule Details</h2>
              <p className="reminder-rule-form-section-helper">
                Pick when the reminder fires and whether it is active.
              </p>
            </header>

            <div className="reminder-rule-form-grid">
              <div className="reminder-rule-form-field">
                <label htmlFor="reminder-rule-name">Rule Name</label>
                <input
                  id="reminder-rule-name"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  disabled={submitting}
                  maxLength={NAME_MAX}
                  placeholder="e.g. 3 days before due"
                  className="reminder-rule-form-input"
                />
                <span className="reminder-rule-form-field-helper">
                  Optional. {NAME_MAX - name.length} characters left.
                </span>
              </div>

              <div className="reminder-rule-form-field">
                <label htmlFor="reminder-rule-channel">Channel</label>
                <div className="reminder-rule-form-channel-wrap">
                  <span className="reminder-rule-form-channel-icon" aria-hidden="true">
                    {MAIL_ICON}
                  </span>
                  <span className="reminder-rule-form-channel-text">
                    <span className="reminder-rule-form-channel-label">Email</span>
                    <span className="reminder-rule-form-channel-helper">
                      Only email is available right now
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="reminder-rule-form-divider" />

            <div className="reminder-rule-form-field">
              <label>When to send</label>
              <div className="reminder-rule-form-segments" role="radiogroup" aria-label="Timing">
                <button
                  type="button"
                  role="radio"
                  aria-checked={timing === 'before'}
                  className={`reminder-rule-form-segment${timing === 'before' ? ' is-active' : ''}`}
                  onClick={() => handleTimingChange('before')}
                  disabled={submitting}
                >
                  Before due
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={timing === 'on'}
                  className={`reminder-rule-form-segment${timing === 'on' ? ' is-active' : ''}`}
                  onClick={() => handleTimingChange('on')}
                  disabled={submitting}
                >
                  On due date
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={timing === 'after'}
                  className={`reminder-rule-form-segment${timing === 'after' ? ' is-active' : ''}`}
                  onClick={() => handleTimingChange('after')}
                  disabled={submitting}
                >
                  After due
                </button>
              </div>
            </div>

            <div className="reminder-rule-form-field">
              <label htmlFor="reminder-rule-days">Days</label>
              <input
                id="reminder-rule-days"
                type="number"
                min={DAYS_MIN}
                max={DAYS_MAX}
                step={1}
                value={days}
                onChange={handleDaysChange}
                disabled={submitting || daysDisabled}
                placeholder={daysDisabled ? 'Not applicable' : 'e.g. 3'}
                className="reminder-rule-form-input reminder-rule-form-days-input"
              />
              <span className="reminder-rule-form-field-helper">
                {daysDisabled
                  ? 'No day count is needed when sending on the due date.'
                  : `Whole number between ${DAYS_MIN} and ${DAYS_MAX}.`}
              </span>
            </div>

            <div className="reminder-rule-form-divider" />

            <div className="reminder-rule-form-setting-card">
              <span className="reminder-rule-form-setting-icon" aria-hidden="true">
                {MAIL_ICON}
              </span>
              <div className="reminder-rule-form-setting-text">
                <p className="reminder-rule-form-setting-label">Enabled</p>
                <p className="reminder-rule-form-setting-helper">
                  Turn this rule on or off without deleting it.
                </p>
              </div>
              <ToggleSwitch
                checked={enabled}
                onChange={setEnabled}
                ariaLabel="Toggle reminder rule"
                disabled={submitting}
              />
            </div>

            {error && (
              <span className="reminder-rule-form-error" role="alert">
                {error}
              </span>
            )}
          </section>
        </div>

        <div className="reminder-rule-form-action-bar">
          <button
            type="button"
            className="reminder-rule-form-link"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <div className="reminder-rule-form-action-bar-right">
            <button
              type="submit"
              className="btn btn-primary reminder-rule-form-primary-btn"
              disabled={submitting}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
