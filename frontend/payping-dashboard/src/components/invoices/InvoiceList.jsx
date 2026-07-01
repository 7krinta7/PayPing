import './InvoiceList.css';
import { Link } from 'react-router-dom';
import { getInitials, avatarColors } from '../../utils/avatar';

// The Invoice column was previously removed pending a real
// `invoiceNumber` field on the backend. The schema now exposes one
// (user-assigned, unique per workspace), so we render it as the
// leftmost column. Legacy invoices that pre-date the field simply
// render with an em-dash and remain fully editable — the user can
// back-fill a number by clicking Edit.

const EMPTY_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

const EDIT_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const PAID_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DELETE_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const USER_OFF_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="23" y1="1" x2="17" y2="7" />
    <line x1="17" y1="1" x2="23" y2="7" />
  </svg>
);

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return INR_FORMATTER.format(n);
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FORMATTER.format(d);
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'paid') return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Returns a normalised client object. If the invoice's client field is
 * missing, a plain id string, or an object with no name, we surface a
 * `missing: true` flag so the UI can render a "Deleted Client" presentation
 * instead of an "Unknown client" placeholder. The invoice itself remains
 * fully actionable (edit / mark paid / delete).
 */
function resolveClient(invoice) {
  const c = invoice?.client;
  if (!c) return { id: null, name: null, email: null, missing: true };
  if (typeof c === 'string') {
    return { id: c, name: null, email: null, missing: true };
  }
  const hasName = typeof c.name === 'string' && c.name.trim() !== '';
  return {
    id: c._id || null,
    name: hasName ? c.name : null,
    email: c.email || null,
    missing: !hasName,
  };
}

function NameCell({ client, isMobile = false }) {
  if (client.missing) {
    return (
      <span className="invoice-name-block invoice-name-block-missing">
        <span className="invoice-name-text invoice-name-text-muted">
          {USER_OFF_ICON}
          Deleted Client
        </span>
        <span className="invoice-name-secondary">
          Client removed
        </span>
      </span>
    );
  }
  return (
    <span className="invoice-name-block">
      <span className="invoice-name-text">{client.name}</span>
      {client.email && (
        <span className="invoice-name-secondary">{client.email}</span>
      )}
    </span>
  );
}

export default function InvoiceList({
  invoices,
  loading,
  error,
  onEdit,
  onMarkPaid,
  onDelete,
  payingId,
  deletingId,
  updatingId,
  emptyTitle = 'No invoices yet',
  emptyBody = 'Create your first invoice to start tracking payments.',
}) {
  if (loading) {
    return (
      <div className="invoice-list-skeleton-wrap" aria-busy="true">
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="invoice-table-invoice-col">Invoice</th>
              <th>Client</th>
              <th className="invoice-table-amount-col">Amount</th>
              <th className="invoice-table-due-col">Due Date</th>
              <th className="invoice-table-status-col">Status</th>
              <th className="invoice-table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i} className="invoice-skeleton-row">
                <td className="invoice-table-invoice-cell">
                  <span className="invoice-skeleton invoice-skeleton-invoice" />
                </td>
                <td>
                  <div className="invoice-skeleton-cell">
                    <span className="invoice-skeleton-avatar" />
                    <span className="invoice-skeleton-lines">
                      <span className="invoice-skeleton invoice-skeleton-name" />
                      <span className="invoice-skeleton invoice-skeleton-email" />
                    </span>
                  </div>
                </td>
                <td className="invoice-table-amount-col"><span className="invoice-skeleton invoice-skeleton-amount" /></td>
                <td className="invoice-table-due-col"><span className="invoice-skeleton invoice-skeleton-date" /></td>
                <td className="invoice-table-status-col"><span className="invoice-skeleton invoice-skeleton-badge" /></td>
                <td className="invoice-table-actions-cell"><span className="invoice-skeleton invoice-skeleton-action" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoice-list-error-wrap">
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="invoice-list-empty-state">
        <span className="invoice-list-empty-icon" aria-hidden="true">
          {EMPTY_ICON}
        </span>
        <p className="invoice-list-empty-title">{emptyTitle}</p>
        <p className="invoice-list-empty-body">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="invoice-list">
      {/* Desktop / tablet table view */}
      <div className="invoice-table-scroll">
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="invoice-table-invoice-col">Invoice</th>
              <th className="invoice-table-name-col">Client</th>
              <th className="invoice-table-amount-col">Amount</th>
              <th className="invoice-table-due-col">Due Date</th>
              <th className="invoice-table-status-col">Status</th>
              <th className="invoice-table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => {
              const isPaying = payingId === invoice._id;
              const isDeleting = deletingId === invoice._id;
              const isUpdating = updatingId === invoice._id;
              const rowBusy = isPaying || isDeleting || isUpdating;
              const isPaid = invoice.status === 'paid';
              const client = resolveClient(invoice);
              const seed = client.missing
                ? (invoice._id || '?')
                : (client?.name || client?.id || invoice._id || '?');
              const colors = avatarColors(seed);
              const initials = client.missing ? '?' : getInitials(client?.name);
              const status = (invoice.status || 'pending').toLowerCase();
              const overdue = isOverdue(invoice.dueDate, invoice.status);
              const dueLabel = formatDate(invoice.dueDate);
              const amountLabel = formatINR(invoice.amount);
              // Surface the user-assigned invoice number verbatim. Empty
              // string → em-dash so the cell stays a stable visual column
              // and the row is recognisable as "no number yet".
              const invoiceNumberLabel = (typeof invoice.invoiceNumber === 'string' && invoice.invoiceNumber.trim())
                ? invoice.invoiceNumber
                : null;

              return (
                <tr
                  key={invoice._id}
                  aria-busy={rowBusy}
                  className={`invoice-table-row${client.missing ? ' is-orphan' : ''}`}
                  style={{ animationDelay: `${Math.min(index * 24, 240)}ms` }}
                >
                  <td className="invoice-table-invoice-cell">
                    {invoiceNumberLabel ? (
                      <span className="invoice-table-invoice-number" title={invoiceNumberLabel}>
                        {invoiceNumberLabel}
                      </span>
                    ) : (
                      <span
                        className="invoice-table-invoice-empty"
                        title="Add an invoice number by editing this invoice"
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td className="invoice-table-name-cell">
                    <div className="invoice-table-name-content">
                    <span
                      className={`invoice-avatar${client.missing ? ' invoice-avatar-missing' : ''}`}
                      style={client.missing ? undefined : { backgroundColor: colors.bg, color: colors.fg }}
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                    <Link
                      to={`/invoices/${invoice._id}`}
                      className="invoice-table-name-link"
                      aria-label={client.missing ? `Open invoice with deleted client` : `Open invoice for ${client.name}`}
                    >
                      <NameCell client={client} />
                    </Link>
                    </div>
                  </td>
                  <td className="invoice-table-amount-cell">
                    <span
                      className="invoice-amount-value"
                      title={amountLabel}
                    >
                      {amountLabel}
                    </span>
                  </td>
                  <td className="invoice-table-due-cell">
                    <span className={`invoice-due-cell${overdue ? ' invoice-due-overdue' : ''}`}>
                      {dueLabel}
                    </span>
                  </td>
                  <td className="invoice-table-status-cell">
                    <div className="invoice-table-status-content">
                      <span className={`invoice-status-badge invoice-status-${status}`}>
                        <span className="invoice-status-dot" aria-hidden="true" />
                        {status}
                      </span>
                    </div>
                  </td>
                  <td className="invoice-table-actions-cell">
                    <div className="invoice-table-actions">
                      <button
                        type="button"
                        className="invoice-icon-btn invoice-icon-btn-edit"
                        onClick={() => onEdit?.(invoice)}
                        disabled={rowBusy}
                        aria-label={isUpdating ? 'Updating invoice' : 'Edit invoice'}
                        title="Edit invoice"
                      >
                        {isUpdating ? (
                          <span className="invoice-icon-btn-spinner" aria-hidden="true" />
                        ) : (
                          EDIT_ICON
                        )}
                      </button>

                      <button
                        type="button"
                        className={`invoice-icon-btn invoice-icon-btn-pay${isPaid ? ' is-hidden' : ''}`}
                        onClick={() => onMarkPaid?.(invoice)}
                        disabled={rowBusy || isPaid}
                        aria-hidden={isPaid ? 'true' : undefined}
                        tabIndex={isPaid ? -1 : 0}
                        aria-label={isPaying ? 'Marking invoice as paid' : 'Mark invoice as paid'}
                        title={isPaid ? 'Already paid' : 'Mark as paid'}
                      >
                        {isPaying ? (
                          <span className="invoice-icon-btn-spinner" aria-hidden="true" />
                        ) : (
                          PAID_ICON
                        )}
                      </button>

                      <button
                        type="button"
                        className="invoice-icon-btn invoice-icon-btn-delete"
                        onClick={() => onDelete?.(invoice)}
                        disabled={rowBusy}
                        aria-label={isDeleting ? 'Deleting invoice' : 'Delete invoice'}
                        title="Delete invoice"
                      >
                        {isDeleting ? (
                          <span className="invoice-icon-btn-spinner" aria-hidden="true" />
                        ) : (
                          DELETE_ICON
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <ul className="invoice-cards" role="list">
        {invoices.map((invoice) => {
          const isPaying = payingId === invoice._id;
          const isDeleting = deletingId === invoice._id;
          const isUpdating = updatingId === invoice._id;
          const rowBusy = isPaying || isDeleting || isUpdating;
          const isPaid = invoice.status === 'paid';
          const client = resolveClient(invoice);
          const seed = client.missing
            ? (invoice._id || '?')
            : (client?.name || client?.id || invoice._id || '?');
          const colors = avatarColors(seed);
          const initials = client.missing ? '?' : getInitials(client?.name);
          const status = (invoice.status || 'pending').toLowerCase();
          const overdue = isOverdue(invoice.dueDate, invoice.status);
          const dueLabel = formatDate(invoice.dueDate);
          const amountLabel = formatINR(invoice.amount);
          const invoiceNumberLabel = (typeof invoice.invoiceNumber === 'string' && invoice.invoiceNumber.trim())
            ? invoice.invoiceNumber
            : null;

          return (
            <li
              key={invoice._id}
              className={`invoice-card invoice-card-${status}${client.missing ? ' is-orphan' : ''}`}
              aria-busy={rowBusy}
            >
              <div className="invoice-card-head">
                <span
                  className={`invoice-avatar${client.missing ? ' invoice-avatar-missing' : ''}`}
                  style={client.missing ? undefined : { backgroundColor: colors.bg, color: colors.fg }}
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <div className="invoice-card-head-text">
                  {invoiceNumberLabel && (
                    <span className="invoice-card-invoice-number" title={invoiceNumberLabel}>
                      {invoiceNumberLabel}
                    </span>
                  )}
                  <Link
                    to={`/invoices/${invoice._id}`}
                    className="invoice-card-name-link"
                    aria-label={client.missing ? 'Open invoice with deleted client' : `Open invoice for ${client.name}`}
                  >
                    <NameCell client={client} isMobile />
                  </Link>
                </div>
                <span className={`invoice-status-badge invoice-status-${status}`}>
                  <span className="invoice-status-dot" aria-hidden="true" />
                  {status}
                </span>
              </div>
              <div className="invoice-card-meta">
                <div className="invoice-card-meta-item">
                  <span className="invoice-card-meta-label">Amount</span>
                  <span className="invoice-amount-value" title={amountLabel}>{amountLabel}</span>
                </div>
                <div className="invoice-card-meta-item">
                  <span className="invoice-card-meta-label">Due</span>
                  <span className={`invoice-due-cell${overdue ? ' invoice-due-overdue' : ''}`}>{dueLabel}</span>
                </div>
              </div>
              <div className="invoice-card-actions">
                <button
                  type="button"
                  className="invoice-icon-btn invoice-icon-btn-edit"
                  onClick={() => onEdit?.(invoice)}
                  disabled={rowBusy}
                  aria-label={isUpdating ? 'Updating invoice' : 'Edit invoice'}
                  title="Edit invoice"
                >
                  {isUpdating ? <span className="invoice-icon-btn-spinner" aria-hidden="true" /> : EDIT_ICON}
                </button>
                <button
                  type="button"
                  className={`invoice-icon-btn invoice-icon-btn-pay${isPaid ? ' is-hidden' : ''}`}
                  onClick={() => onMarkPaid?.(invoice)}
                  disabled={rowBusy || isPaid}
                  aria-hidden={isPaid ? 'true' : undefined}
                  tabIndex={isPaid ? -1 : 0}
                  aria-label={isPaying ? 'Marking invoice as paid' : 'Mark invoice as paid'}
                  title={isPaid ? 'Already paid' : 'Mark as paid'}
                >
                  {isPaying ? <span className="invoice-icon-btn-spinner" aria-hidden="true" /> : PAID_ICON}
                </button>
                <button
                  type="button"
                  className="invoice-icon-btn invoice-icon-btn-delete"
                  onClick={() => onDelete?.(invoice)}
                  disabled={rowBusy}
                  aria-label={isDeleting ? 'Deleting invoice' : 'Delete invoice'}
                  title="Delete invoice"
                >
                  {isDeleting ? <span className="invoice-icon-btn-spinner" aria-hidden="true" /> : DELETE_ICON}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}