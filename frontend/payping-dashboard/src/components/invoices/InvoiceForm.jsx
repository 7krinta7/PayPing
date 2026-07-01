import { useMemo, useState } from 'react';
import './InvoiceForm.css';
import { getInitials, avatarColors } from '../../utils/avatar';

const INITIAL_STATE = {
  client: '',
  invoiceNumber: '',
  amount: '',
  dueDate: '',
  description: ''
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const WHATSAPP_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CHEVRON_DOWN = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const RUPEE_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="M6 13l8 8" />
    <path d="M6 13h3a5 5 0 0 0 0-10" />
  </svg>
);

const HELP_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function ToggleSwitch({ checked, disabled = false, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`invoice-form-toggle${checked ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <span className="invoice-form-toggle-knob" aria-hidden="true" />
    </button>
  );
}

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending', tone: 'pending' },
  { value: 'Paid', label: 'Paid', tone: 'paid' },
  { value: 'Overdue', label: 'Overdue', tone: 'overdue' },
];

function StatusSelect({ value, onChange, disabled }) {
  const current = STATUS_OPTIONS.find((o) => o.value === value) || STATUS_OPTIONS[0];
  return (
    <div className="invoice-form-status-wrap">
      <select
        id="invoice-status"
        name="status"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="invoice-form-status-select"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className={`invoice-form-status-chip invoice-form-status-chip-${current.tone}`}>
        <span className="invoice-form-status-dot" aria-hidden="true" />
        {current.label}
      </span>
      <span className="invoice-form-status-chevron" aria-hidden="true">{CHEVRON_DOWN}</span>
    </div>
  );
}

export default function InvoiceForm({
  initialValues,
  clients = [],
  onSubmit,
  onCancel,
  onAddNewClient,
  submitting,
  // True when the form is editing an already-paid invoice. Only the
  // invoiceNumber and description remain editable in that case — the
  // financial record (client / amount / dueDate / status) is locked so
  // the paid transaction stays faithful. The parent supplies this from
  // the loaded invoice's `status` field.
  isPaid = false,
  mode = 'create', // 'create' | 'edit'
  // Server-side error from the parent (e.g. 409 duplicate invoiceNumber).
  // Displayed in the form-level error slot, taking priority over the
  // local client-side validation error.
  serverError = '',
}) {
  const [form, setForm] = useState(() => {
    const merged = { ...INITIAL_STATE, ...(initialValues || {}) };
    if (merged.client && typeof merged.client === 'object') {
      merged.client = merged.client._id || '';
    }
    return merged;
  });
  const [error, setError] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [statusLocal, setStatusLocal] = useState('Pending');
  const [emailReminder, setEmailReminder] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [clients, clientQuery]);

  const selectedClient = useMemo(() => {
    if (!form.client) return null;
    return clients.find((c) => c._id === form.client) || null;
  }, [clients, form.client]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    // Paid-invoice edits only carry the invoiceNumber + description
    // through to the server (see `handleSubmit`), so the only fields
    // worth validating on a paid edit are those two. All other fields
    // are still required on create + on edit of a non-paid invoice.
    if (mode === 'edit' && isPaid) {
      const trimmedInvoiceNumber = (form.invoiceNumber || '').trim();
      if (
        trimmedInvoiceNumber !== (initialValues?.invoiceNumber || '').trim()
      ) {
        const hadOriginalNumber = Boolean(
          (initialValues?.invoiceNumber || '').trim()
        );
        if (hadOriginalNumber && !trimmedInvoiceNumber) {
          return 'Invoice number is required';
        }
      }
      return '';
    }

    if (!form.client) return 'Client is required';
    // Invoice number is required on create (every new invoice must have
    // a user-assigned identifier) and on edit when the draft differs
    // from the value present on the loaded record. Legacy invoices
    // (pre-this-field) often arrive with no invoiceNumber; the form
    // must let the user save other changes without forcing them to
    // add a number first, otherwise they can't update an overdue
    // amount/due-date on a legacy row.
    const trimmedInvoiceNumber = (form.invoiceNumber || '').trim();
    if (mode !== 'edit' && !trimmedInvoiceNumber) {
      return 'Invoice number is required';
    }
    if (mode === 'edit' && trimmedInvoiceNumber !== (initialValues?.invoiceNumber || '').trim()) {
      // The user is touching the invoice number. If they cleared it,
      // that is allowed (clearance is a valid edit). If they typed
      // something new, it must be non-empty.
      const hadOriginalNumber = Boolean(
        (initialValues?.invoiceNumber || '').trim()
      );
      if (hadOriginalNumber && !trimmedInvoiceNumber) {
        return 'Invoice number is required';
      }
    }
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      return 'Amount must be greater than 0';
    }
    if (!form.dueDate) return 'Due date is required';
    if (!DATE_RE.test(form.dueDate)) {
      return 'Due date must be in YYYY-MM-DD format';
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
    setError('');

    // Build the patch payload. Invoice number handling is a little
    // subtle: legacy invoices have no invoiceNumber on the server, and
    // writing an empty string would push an empty value into the
    // (sparse=false) unique index — which would later collide with any
    // other legacy edit. Only send the field when the user has typed
    // something, or when the original record already had one (so the
    // user can clear or replace it).
    const trimmedInvoiceNumber = (form.invoiceNumber || '').trim();
    const originalInvoiceNumber = (initialValues?.invoiceNumber || '').trim();
    const shouldSendInvoiceNumber =
      trimmedInvoiceNumber.length > 0 || originalInvoiceNumber.length > 0;

    // On a paid-invoice edit the locked fields (client / amount /
    // dueDate / status) must not be sent — the server enforces this as
    // well, but we already strip them here so the request body never
    // even carries a forbidden field. Status is not in the payload
    // shape anyway; it is owned by the mark-paid route.
    if (mode === 'edit' && isPaid) {
      const payload = { description: form.description.trim() };
      if (shouldSendInvoiceNumber) {
        payload.invoiceNumber = trimmedInvoiceNumber;
      }
      onSubmit(payload);
      return;
    }

    const payload = {
      client: form.client,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      description: form.description.trim(),
    };
    if (shouldSendInvoiceNumber) {
      payload.invoiceNumber = trimmedInvoiceNumber;
    }
    onSubmit(payload);
  };

  const handleCancel = () => {
    setForm(INITIAL_STATE);
    setError('');
    setClientQuery('');
    setStatusLocal('Pending');
    setEmailReminder(true);
    onCancel();
  };

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Edit Invoice' : 'Create Invoice';
  const subtitle = isEdit
    ? 'Update invoice details, payment terms, and reminder preferences.'
    : 'Create and manage invoices for your clients.';
  const submitLabel = isEdit
    ? (submitting ? 'Saving…' : 'Save Changes')
    : (submitting ? 'Creating…' : 'Create Invoice');

  const clientError = error && form.client === '' && error.toLowerCase().includes('client')
    ? error
    : '';
  const formError = error && !clientError ? error : '';

  return (
    <div className="invoice-form-page">
      <header className="invoice-form-header">
        <div className="invoice-form-header-text">
          <p className="invoice-form-eyebrow">Workspace</p>
          <h1 className="invoice-form-title">{title}</h1>
          <p className="invoice-form-subtitle">{subtitle}</p>
        </div>
        <div className="invoice-form-header-meta">
          <button
            type="button"
            className="invoice-form-help-trigger"
            onClick={() => setHelpOpen((v) => !v)}
            aria-expanded={helpOpen}
            aria-controls="invoice-form-help"
          >
            {HELP_ICON}
            {helpOpen ? 'Hide reminder info' : 'Learn more about reminders'}
          </button>
        </div>
      </header>

      {helpOpen && (
        <section id="invoice-form-help" className="invoice-form-help">
          <div className="invoice-form-help-col">
            <h3 className="invoice-form-help-title">Reminder Schedule</h3>
            <ul className="invoice-form-help-list">
              <li>7 days before due date — friendly heads-up</li>
              <li>1 day before due date — payment reminder</li>
              <li>3 days after due date — overdue notice</li>
            </ul>
          </div>
          <div className="invoice-form-help-col">
            <h3 className="invoice-form-help-title">Payment Tracking</h3>
            <ul className="invoice-form-help-list">
              <li>Real-time status updates in the Invoices table</li>
              <li>Outstanding totals reflected in your summary bar</li>
              <li>Full audit trail of reminders sent and deliveries</li>
            </ul>
          </div>
        </section>
      )}

      <form className="invoice-form-card-form" onSubmit={handleSubmit} noValidate>
        <div className="invoice-form-card">
          <div className="invoice-form-columns">
            {/* Left column — Client Details */}
            <section className="invoice-form-section">
              <header className="invoice-form-section-header">
                <h2 className="invoice-form-section-title">Client Details</h2>
                <p className="invoice-form-section-helper">Choose the client you’re invoicing.</p>
                {mode === 'edit' && isPaid && (
                  <p className="invoice-form-section-locked-helper" role="note">
                    Paid invoices can only update their invoice number and description.
                  </p>
                )}
              </header>

              <div className="invoice-form-searchable-client">
                {selectedClient ? (
                  <div className="invoice-form-client-selected">
                    <span
                      className="invoice-form-client-avatar"
                      style={{
                        backgroundColor: avatarColors(selectedClient.name).bg,
                        color: avatarColors(selectedClient.name).fg,
                      }}
                      aria-hidden="true"
                    >
                      {getInitials(selectedClient.name)}
                    </span>
                    <span className="invoice-form-client-selected-check" aria-hidden="true">
                      {CHECK_ICON}
                    </span>
                    <span className="invoice-form-client-selected-text">
                      <span className="invoice-form-client-selected-name">{selectedClient.name}</span>
                      {selectedClient.email && (
                        <span className="invoice-form-client-selected-email">{selectedClient.email}</span>
                      )}
                    </span>
                    {/* The Change Client action is hidden on paid edits
                        because the client record is locked — surfacing
                        it would be a UX dead end. */}
                    {!(mode === 'edit' && isPaid) && (
                      <button
                        type="button"
                        className="invoice-form-link"
                        onClick={() => setForm((p) => ({ ...p, client: '' }))}
                        disabled={submitting}
                      >
                        Change Client
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="invoice-form-searchable-client-input">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="search"
                        value={clientQuery}
                        onChange={(e) => setClientQuery(e.target.value)}
                        placeholder="Search clients by name or email…"
                        aria-label="Search clients"
                        // Locked on a paid edit: the client field stays
                        // populated but the picker can no longer be used.
                        disabled={submitting || (mode === 'edit' && isPaid)}
                      />
                    </div>

                    <div className="invoice-form-client-list" role="listbox" aria-label="Available clients">
                      {filteredClients.length === 0 ? (
                        <p className="invoice-form-client-empty">No clients match your search.</p>
                      ) : (
                        filteredClients.map((c) => {
                          const colors = avatarColors(c.name);
                          return (
                            <button
                              key={c._id}
                              type="button"
                              role="option"
                              aria-selected={form.client === c._id}
                              className={`invoice-form-client-row${form.client === c._id ? ' is-selected' : ''}`}
                              onClick={() => setForm((p) => ({ ...p, client: c._id }))}
                              // Locked on a paid edit so a click cannot
                              // re-assign the invoice to a different client.
                              disabled={submitting || (mode === 'edit' && isPaid)}
                            >
                              <span
                                className="invoice-form-client-avatar"
                                style={{ backgroundColor: colors.bg, color: colors.fg }}
                                aria-hidden="true"
                              >
                                {getInitials(c.name)}
                              </span>
                              <span className="invoice-form-client-row-text">
                                <span className="invoice-form-client-row-name">{c.name}</span>
                                {c.email && (
                                  <span className="invoice-form-client-row-email">{c.email}</span>
                                )}
                              </span>
                              {form.client === c._id && (
                                <span className="invoice-form-client-row-check" aria-hidden="true">
                                  {CHECK_ICON}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {clientError && (
                  <span className="invoice-form-error">{clientError}</span>
                )}

                {!(mode === 'edit' && isPaid) && (
                  <div className="invoice-form-client-footer">
                    <p className="invoice-form-client-footer-helper">
                      Don&apos;t see the client?{' '}
                      <a
                        href="/clients"
                        className="invoice-form-client-footer-link"
                        onClick={(e) => {
                          // Let the parent decide how to navigate (avoids a
                          // full reload) so the SPA history is preserved.
                          e.preventDefault();
                          onAddNewClient?.();
                        }}
                      >
                        Add them on the Clients page
                      </a>{' '}
                      first, then return here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Right column — Invoice Configuration */}
            <section className="invoice-form-section">
              <header className="invoice-form-section-header">
                <h2 className="invoice-form-section-title">Invoice Configuration</h2>
                <p className="invoice-form-section-helper">Set amount, due date, status, and description.</p>
              </header>

              <div className="invoice-form-field invoice-form-field-wide">
                <label htmlFor="invoice-number">
                  Invoice Number
                  <span className="invoice-form-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="invoice-number"
                  name="invoiceNumber"
                  type="text"
                  value={form.invoiceNumber}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="INV-2026-001"
                  maxLength={50}
                  autoComplete="off"
                  className="invoice-form-input"
                  aria-describedby="invoice-number-helper"
                  aria-required="true"
                />
                <p
                  id="invoice-number-helper"
                  className="invoice-form-field-helper"
                >
                  Unique to your workspace. Shown on the invoice list, reminders, and emails.
                </p>
              </div>

              <div className="invoice-form-grid">
                <div className="invoice-form-field">
                  <label htmlFor="invoice-amount">Amount</label>
                  <div className="invoice-form-amount-wrap">
                    <span className="invoice-form-amount-prefix" aria-hidden="true">
                      {RUPEE_ICON}
                    </span>
                    <input
                      id="invoice-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={handleChange}
                      // Locked on a paid edit: the paid amount must
                      // not change after the transaction records it.
                      disabled={submitting || (mode === 'edit' && isPaid)}
                      placeholder="0.00"
                      className="invoice-form-amount-input"
                    />
                  </div>
                </div>

                <div className="invoice-form-field">
                  <label htmlFor="invoice-duedate">Due Date</label>
                  <input
                    id="invoice-duedate"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={handleChange}
                    // Locked on a paid edit: the due date is part of
                    // the historical record of the transaction.
                    disabled={submitting || (mode === 'edit' && isPaid)}
                    className="invoice-form-input"
                  />
                </div>

                <div className="invoice-form-field">
                  <label htmlFor="invoice-status">Status</label>
                  <StatusSelect
                    value={statusLocal}
                    onChange={setStatusLocal}
                    // Locked on a paid edit: status transitions are
                    // owned by the mark-paid / payment flow, never the
                    // edit form.
                    disabled={submitting || (mode === 'edit' && isPaid)}
                  />
                </div>
              </div>

              <div className="invoice-form-field invoice-form-field-wide">
                <label htmlFor="invoice-description">Description</label>
                <textarea
                  id="invoice-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  disabled={submitting}
                  rows={4}
                  placeholder="Describe the work, products, or services included on this invoice…"
                  className="invoice-form-textarea"
                />
              </div>

              {(serverError || formError) && (
                <span className="invoice-form-error">{serverError || formError}</span>
              )}
            </section>
          </div>

          {/* Automation & Reminders — full-width below */}
          <div className="invoice-form-divider" />

          <section className="invoice-form-section">
            <header className="invoice-form-section-header">
              <h2 className="invoice-form-section-title">Automation & Reminders</h2>
              <p className="invoice-form-section-helper">Decide how PayPing follows up on this invoice.</p>
            </header>

            <div className="invoice-form-settings-grid">
              <div className="invoice-form-setting-card">
                <span className="invoice-form-setting-icon invoice-form-setting-icon-mail" aria-hidden="true">
                  {MAIL_ICON}
                </span>
                <div className="invoice-form-setting-text">
                  <p className="invoice-form-setting-label">Email Reminder</p>
                  <p className="invoice-form-setting-helper">Automatically email the client before the due date.</p>
                </div>
                <ToggleSwitch
                  checked={emailReminder}
                  onChange={setEmailReminder}
                  ariaLabel="Toggle email reminder"
                />
              </div>

              <div className="invoice-form-setting-card is-disabled">
                <span className="invoice-form-setting-icon invoice-form-setting-icon-wa" aria-hidden="true">
                  {WHATSAPP_ICON}
                </span>
                <div className="invoice-form-setting-text">
                  <p className="invoice-form-setting-label">
                    WhatsApp Reminder
                    <span className="invoice-form-badge">Coming Soon</span>
                  </p>
                  <p className="invoice-form-setting-helper">Send WhatsApp reminders before and after the due date.</p>
                </div>
                <ToggleSwitch
                  checked={false}
                  disabled
                  onChange={() => {}}
                  ariaLabel="Toggle WhatsApp reminder (coming soon)"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sticky bottom action bar */}
        <div className="invoice-form-action-bar">
          <button
            type="button"
            className="invoice-form-link"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <div className="invoice-form-action-bar-right">
            <button
              type="button"
              className="btn btn-secondary invoice-form-secondary-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              Save Draft
            </button>
            <button
              type="submit"
              className="btn btn-primary invoice-form-primary-btn"
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