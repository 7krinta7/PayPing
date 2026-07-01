import './ReminderUpcomingQueue.css';

const EMPTY_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FORMATTER.format(d);
}

function resolveClientName(invoice) {
  if (!invoice || typeof invoice === 'string') return '—';
  const c = invoice.client;
  if (!c || typeof c === 'string') return '—';
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  return name || '—';
}

// Surface the user-assigned invoice number when present. Upcoming queue
// rows are previewed against pending invoices, every one of which the
// form requires to have a number — but legacy pending invoices
// (pre-invoiceNumber) may still appear here, so we fall back to an
// em-dash rather than fabricating a derived reference.
function resolveInvoiceNumber(invoice) {
  if (!invoice || typeof invoice === 'string') return null;
  const raw = typeof invoice.invoiceNumber === 'string' ? invoice.invoiceNumber.trim() : '';
  return raw || null;
}

function resolveRuleName(rule) {
  if (!rule) return '—';
  const name = typeof rule.name === 'string' ? rule.name.trim() : '';
  return name || 'Untitled rule';
}

/**
 * ReminderUpcomingQueue — presentational preview of reminders the
 * scheduler expects to fire next.
 *
 * Pure component: no fetching. Parent supplies `rows`, `loading`,
 * `error`. This component NEVER sends a reminder — it is preview-only.
 *
 * Renders:
 *   - loading → skeleton rows matching the final row footprint
 *   - error   → reuses the global `.alert .alert-error` class
 *   - empty   → honest empty state explaining what would normally appear
 *   - data    → table sorted by scheduledFor ascending (already enforced server-side)
 */
export default function ReminderUpcomingQueue({
  rows = [],
  loading = false,
  error = ''
}) {
  return (
    <section className="reminder-upcoming-queue" aria-label="Upcoming reminder queue">
      <div className="reminder-upcoming-queue-card">
        <header className="reminder-upcoming-queue-card-header">
          <div className="reminder-upcoming-queue-card-header-text">
            <h2 className="reminder-upcoming-queue-card-title">Upcoming Reminder Queue</h2>
            <p className="reminder-upcoming-queue-card-subtitle">
              Preview of reminders PayPing plans to send next. Nothing is sent from this page.
            </p>
          </div>
          {!loading && !error && (
            <span className="reminder-upcoming-queue-card-meta">
              {rows.length === 0
                ? 'Nothing queued'
                : `${rows.length} ${rows.length === 1 ? 'reminder' : 'reminders'}`}
              <span className="reminder-upcoming-queue-card-meta-count" aria-hidden="true">
                {rows.length}
              </span>
            </span>
          )}
        </header>

        {/* Loading state. */}
        {loading && (
          <div className="reminder-upcoming-queue-table-wrap" aria-busy="true">
            <table className="reminder-upcoming-queue-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Invoice</th>
                  <th>Rule</th>
                  <th className="reminder-upcoming-queue-col-scheduled">Scheduled</th>
                  <th className="reminder-upcoming-queue-col-channel">Channel</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i} className="reminder-upcoming-queue-skeleton-row">
                    <td><span className="reminder-upcoming-queue-skeleton reminder-upcoming-queue-skeleton-client" /></td>
                    <td><span className="reminder-upcoming-queue-skeleton reminder-upcoming-queue-skeleton-invoice" /></td>
                    <td><span className="reminder-upcoming-queue-skeleton reminder-upcoming-queue-skeleton-rule" /></td>
                    <td className="reminder-upcoming-queue-col-scheduled">
                      <span className="reminder-upcoming-queue-skeleton reminder-upcoming-queue-skeleton-scheduled" />
                    </td>
                    <td className="reminder-upcoming-queue-col-channel">
                      <span className="reminder-upcoming-queue-skeleton reminder-upcoming-queue-skeleton-channel" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error state. */}
        {!loading && error && (
          <div className="reminder-upcoming-queue-error-wrap">
            <div className="alert alert-error" role="alert">{error}</div>
          </div>
        )}

        {/* Empty state. */}
        {!loading && !error && rows.length === 0 && (
          <div className="reminder-upcoming-queue-empty">
            <span className="reminder-upcoming-queue-empty-icon" aria-hidden="true">
              {EMPTY_ICON}
            </span>
            <p className="reminder-upcoming-queue-empty-title">No upcoming reminders</p>
            <p className="reminder-upcoming-queue-empty-body">
              Based on your current rules and pending invoices, PayPing has nothing scheduled
              to send in the next two weeks. New pending invoices or rule changes will populate
              this preview.
            </p>
          </div>
        )}

        {/* Data state. */}
        {!loading && !error && rows.length > 0 && (
          <div className="reminder-upcoming-queue-table-wrap">
            <table className="reminder-upcoming-queue-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Invoice</th>
                  <th>Rule</th>
                  <th className="reminder-upcoming-queue-col-scheduled">Scheduled</th>
                  <th className="reminder-upcoming-queue-col-channel">Channel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const clientName = resolveClientName(row.invoice);
                  const ruleName = resolveRuleName(row.rule);
                  const channel = (row.channel || '').toLowerCase();
                  const invoiceNumber = resolveInvoiceNumber(row.invoice);
                  return (
                    <tr key={row._id}>
                      <td className="reminder-upcoming-queue-cell-client">{clientName}</td>
                      <td className="reminder-upcoming-queue-cell-invoice">
                        {invoiceNumber ? (
                          <span
                            className="reminder-upcoming-queue-invoice-number"
                            title={invoiceNumber}
                          >
                            {invoiceNumber}
                          </span>
                        ) : row.invoice && row.invoice._id ? (
                          <span
                            className="reminder-upcoming-queue-invoice-muted"
                            title="Legacy invoice without an invoice number"
                          >
                            —
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="reminder-upcoming-queue-cell-rule">{ruleName}</td>
                      <td className="reminder-upcoming-queue-col-scheduled">
                        {formatDate(row.scheduledFor)}
                      </td>
                      <td className="reminder-upcoming-queue-col-channel">
                        <span className="reminder-upcoming-queue-channel">
                          {channel || '—'}
                        </span>
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