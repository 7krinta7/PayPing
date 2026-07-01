import { useNavigate } from 'react-router-dom';
import './ReminderRecentActivity.css';

const EMPTY_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return DATETIME_FORMATTER.format(d);
}

/**
 * Resolve the human label for a `reminderRule` reference on a history row.
 * Mirrors the rule in ReminderHistory.jsx so both surfaces agree.
 *   - null / undefined   → "Legacy"
 *   - present in ruleMap → rule.name (or "Untitled rule" fallback)
 *   - not in ruleMap     → "—" (rule deleted but history row still references it)
 */
function resolveRuleLabel(ruleId, ruleMap) {
  if (!ruleId) return 'Legacy';
  const rule = ruleMap && ruleMap[ruleId];
  if (!rule) return '—';
  const name = typeof rule.name === 'string' ? rule.name.trim() : '';
  return name || 'Untitled rule';
}

function resolveClientName(invoice) {
  if (!invoice) return '—';
  if (typeof invoice === 'string') return '—';
  const c = invoice.client;
  if (!c) return '—';
  if (typeof c === 'string') return '—';
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  return name || '—';
}

// Resolve the user-assigned invoice number for a populated invoice
// object. Legacy invoices pre-dating the field surface as null so the
// caller can render the muted em-dash state.
function resolveInvoiceNumber(invoice) {
  if (!invoice || typeof invoice === 'string') return null;
  const raw = typeof invoice.invoiceNumber === 'string' ? invoice.invoiceNumber.trim() : '';
  return raw || null;
}

// Resolve the user-assigned invoice number, falling back to a
// short-form ObjectId tail for legacy invoices (pre-invoiceNumber).
// Used only in the aria-label so screen readers always hear *some*
// reference for the row, never a bare "View invoice".
function resolveInvoiceReference(invoice) {
  const number = resolveInvoiceNumber(invoice);
  if (number) return number;
  const id = invoice && typeof invoice === 'object' ? invoice._id : invoice;
  return id ? `invoice ${String(id).slice(-6)}` : 'invoice';
}

/**
 * ReminderRecentActivity — presentational list of the most recent
 * ReminderHistory rows for the dashboard.
 *
 * Pure component: no fetching. Parent supplies `rows`, `loading`,
 * `error`, and `ruleMap`. Invoice cells are clickable and navigate to
 * the existing Invoice Detail page.
 *
 * Renders:
 *   - loading → skeleton rows matching the final row footprint
 *   - error   → reuses the global `.alert .alert-error` class
 *   - empty   → dashed-border empty card with honest copy
 *   - data    → table, newest first (backend already sorts desc)
 */
export default function ReminderRecentActivity({
  rows = [],
  loading = false,
  error = '',
  ruleMap = {}
}) {
  const navigate = useNavigate();

  const goToInvoice = (invoice) => {
    if (!invoice || !invoice._id) return;
    navigate(`/invoices/${invoice._id}`);
  };

  return (
    <section className="reminder-recent-activity" aria-label="Recent reminder activity">
      <div className="reminder-recent-activity-card">
        <header className="reminder-recent-activity-card-header">
          <div className="reminder-recent-activity-card-header-text">
            <h2 className="reminder-recent-activity-card-title">Recent Reminder Activity</h2>
            <p className="reminder-recent-activity-card-subtitle">
              The last reminders PayPing delivered. Click an invoice to view its details.
            </p>
          </div>
          {!loading && !error && (
            <span className="reminder-recent-activity-card-meta">
              {rows.length === 0
                ? 'No entries'
                : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
              <span className="reminder-recent-activity-card-meta-count" aria-hidden="true">
                {rows.length}
              </span>
            </span>
          )}
        </header>

        {/* Loading state — skeleton rows. */}
        {loading && (
          <div className="reminder-recent-activity-table-wrap" aria-busy="true">
            <table className="reminder-recent-activity-table">
              <thead>
                <tr>
                  <th className="reminder-recent-activity-col-status">Status</th>
                  <th>Client</th>
                  <th>Invoice</th>
                  <th>Rule</th>
                  <th className="reminder-recent-activity-col-channel">Channel</th>
                  <th className="reminder-recent-activity-col-sent">Sent</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className="reminder-recent-activity-skeleton-row">
                    <td className="reminder-recent-activity-col-status">
                      <span className="reminder-recent-activity-skeleton reminder-recent-activity-skeleton-status" />
                    </td>
                    <td><span className="reminder-recent-activity-skeleton reminder-recent-activity-skeleton-client" /></td>
                    <td><span className="reminder-recent-activity-skeleton reminder-recent-activity-skeleton-invoice" /></td>
                    <td><span className="reminder-recent-activity-skeleton reminder-recent-activity-skeleton-rule" /></td>
                    <td className="reminder-recent-activity-col-channel">
                      <span className="reminder-recent-activity-skeleton reminder-recent-activity-skeleton-channel" />
                    </td>
                    <td className="reminder-recent-activity-col-sent">
                      <span className="reminder-recent-activity-skeleton reminder-recent-activity-skeleton-sent" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error state. */}
        {!loading && error && (
          <div className="reminder-recent-activity-error-wrap">
            <div className="alert alert-error" role="alert">{error}</div>
          </div>
        )}

        {/* Empty state — honest, no fabricated rows. */}
        {!loading && !error && rows.length === 0 && (
          <div className="reminder-recent-activity-empty">
            <span className="reminder-recent-activity-empty-icon" aria-hidden="true">
              {EMPTY_ICON}
            </span>
            <p className="reminder-recent-activity-empty-title">No reminders sent yet</p>
            <p className="reminder-recent-activity-empty-body">
              When PayPing sends a reminder, it will appear here with its delivery channel,
              client, and the invoice it relates to.
            </p>
          </div>
        )}

        {/* Data state. */}
        {!loading && !error && rows.length > 0 && (
          <div className="reminder-recent-activity-table-wrap">
            <table className="reminder-recent-activity-table">
              <thead>
                <tr>
                  <th className="reminder-recent-activity-col-status">Status</th>
                  <th>Client</th>
                  <th>Invoice</th>
                  <th>Rule</th>
                  <th className="reminder-recent-activity-col-channel">Channel</th>
                  <th className="reminder-recent-activity-col-sent">Sent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = (row.status || '').toLowerCase();
                  const channel = (row.channel || '').toLowerCase();
                  const ruleLabel = resolveRuleLabel(row.reminderRule, ruleMap);
                  const clientName = resolveClientName(row.invoice);
                  const isFailed = status === 'failed';
                  const invoiceId =
                    row.invoice && typeof row.invoice === 'object' ? row.invoice._id : row.invoice;
                  const invoiceNumber = resolveInvoiceNumber(row.invoice);
                  const invoiceReference = resolveInvoiceReference(row.invoice);
                  return (
                    <tr key={row._id} className={isFailed ? 'is-failed' : undefined}>
                      <td className="reminder-recent-activity-col-status">
                        <span className={`reminder-recent-activity-status reminder-recent-activity-status-${status || 'unknown'}`}>
                          <span className="reminder-recent-activity-status-dot" aria-hidden="true" />
                          {status || 'unknown'}
                        </span>
                      </td>
                      <td className="reminder-recent-activity-cell-client">{clientName}</td>
                      <td className="reminder-recent-activity-cell-invoice">
                        {invoiceId ? (
                          <div className="reminder-recent-activity-invoice-stack">
                            {invoiceNumber ? (
                              <span
                                className="reminder-recent-activity-invoice-number"
                                title={invoiceNumber}
                              >
                                {invoiceNumber}
                              </span>
                            ) : (
                              <span className="reminder-recent-activity-cell-text-muted" aria-label="No invoice number assigned">
                                —
                              </span>
                            )}
                            <button
                              type="button"
                              className="reminder-recent-activity-invoice-link"
                              onClick={() => goToInvoice(row.invoice)}
                              aria-label={`View ${invoiceReference}`}
                            >
                              View invoice
                            </button>
                          </div>
                        ) : (
                          <span className="reminder-recent-activity-cell-text-muted">—</span>
                        )}
                      </td>
                      <td className="reminder-recent-activity-cell-rule">
                        {ruleLabel === '—' ? (
                          <span className="reminder-recent-activity-cell-text-muted">—</span>
                        ) : (
                          ruleLabel
                        )}
                      </td>
                      <td className="reminder-recent-activity-col-channel">
                        <span className="reminder-recent-activity-channel">{channel || '—'}</span>
                      </td>
                      <td className="reminder-recent-activity-col-sent">
                        {formatDateTime(row.sentAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}