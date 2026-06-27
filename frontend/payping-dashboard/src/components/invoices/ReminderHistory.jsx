import './ReminderHistory.css';

const EMPTY_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ALERT_ICON = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FORMATTER.format(d);
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return DATETIME_FORMATTER.format(d);
}

/**
 * Resolve the human label for a `reminderRule` reference on a history row.
 * - null / undefined / empty → "Legacy" (rows written by the pre-rules scan).
 * - present in `ruleMap`     → that rule's `name` (or "Untitled rule" fallback).
 * - not in `ruleMap`         → em-dash (rule was deleted but the history row
 *                              still references it — honest, not fabricated).
 */
function resolveRuleLabel(ruleId, ruleMap) {
  if (!ruleId) return 'Legacy';
  const rule = ruleMap && ruleMap[ruleId];
  if (!rule) return '—';
  const name = typeof rule.name === 'string' ? rule.name.trim() : '';
  return name || 'Untitled rule';
}

/**
 * ReminderHistory — presentational audit list for an invoice.
 *
 * Pure component: no fetching. The parent (`InvoiceDetailPage`) supplies
 * `rows`, `loading`, and `error`. The component renders the appropriate
 * state in each case:
 *   - loading → skeleton rows that match the final row footprint
 *   - error   → reuses the global `.alert.alert-error` class
 *   - empty   → dashed-border empty card with honest copy
 *   - data    → table, newest first (backend already sorts desc)
 */
export default function ReminderHistory({
  rows = [],
  loading = false,
  error = '',
  ruleMap = {}
}) {
  return (
    <section className="reminder-history" aria-label="Reminder history">
      <div className="reminder-history-card">
        <header className="reminder-history-card-header">
          <div className="reminder-history-card-header-text">
            <h2 className="reminder-history-card-title">Reminder History</h2>
            <p className="reminder-history-card-subtitle">
              Every reminder PayPing has sent for this invoice. Newest first.
            </p>
          </div>
          {!loading && !error && (
            <span className="reminder-history-card-meta">
              {rows.length === 0
                ? 'No entries'
                : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
              <span className="reminder-history-card-meta-count" aria-hidden="true">
                {rows.length}
              </span>
            </span>
          )}
        </header>

        {/* Loading state — skeleton matches the final row layout. */}
        {loading && (
          <div className="reminder-history-table-wrap" aria-busy="true">
            <table className="reminder-history-table">
              <thead>
                <tr>
                  <th className="reminder-history-col-status">Status</th>
                  <th className="reminder-history-col-channel">Channel</th>
                  <th className="reminder-history-col-rule">Rule</th>
                  <th className="reminder-history-col-date">Scheduled</th>
                  <th className="reminder-history-col-date">Sent</th>
                  <th className="reminder-history-col-error">Error</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className="reminder-history-skeleton-row">
                    <td className="reminder-history-col-status">
                      <span className="reminder-history-skeleton reminder-history-skeleton-status" />
                    </td>
                    <td className="reminder-history-col-channel">
                      <span className="reminder-history-skeleton reminder-history-skeleton-channel" />
                    </td>
                    <td className="reminder-history-col-rule">
                      <span className="reminder-history-skeleton reminder-history-skeleton-rule" />
                    </td>
                    <td className="reminder-history-col-date">
                      <span className="reminder-history-skeleton reminder-history-skeleton-date" />
                    </td>
                    <td className="reminder-history-col-date">
                      <span className="reminder-history-skeleton reminder-history-skeleton-sent" />
                    </td>
                    <td className="reminder-history-col-error">
                      <span className="reminder-history-skeleton reminder-history-skeleton-error" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error state — reuses the global alert styles. */}
        {!loading && error && (
          <div style={{ padding: 'var(--space-4) var(--space-6) var(--space-6)' }}>
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          </div>
        )}

        {/* Empty state — honest, no fabricated rows. */}
        {!loading && !error && rows.length === 0 && (
          <div className="reminder-history-empty">
            <span className="reminder-history-empty-icon" aria-hidden="true">
              {EMPTY_ICON}
            </span>
            <p className="reminder-history-empty-title">No reminders sent yet</p>
            <p className="reminder-history-empty-body">
              When PayPing sends a reminder for this invoice, it will appear here with its
              delivery channel, scheduled time, and result.
            </p>
          </div>
        )}

        {/* Data state — table. Newest-first ordering is enforced server-side. */}
        {!loading && !error && rows.length > 0 && (
          <div className="reminder-history-table-wrap">
            <table className="reminder-history-table">
              <thead>
                <tr>
                  <th className="reminder-history-col-status">Status</th>
                  <th className="reminder-history-col-channel">Channel</th>
                  <th className="reminder-history-col-rule">Rule</th>
                  <th className="reminder-history-col-date">Scheduled</th>
                  <th className="reminder-history-col-date">Sent</th>
                  <th className="reminder-history-col-error">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = (row.status || '').toLowerCase();
                  const channel = (row.channel || '').toLowerCase();
                  const ruleLabel = resolveRuleLabel(row.reminderRule, ruleMap);
                  const isFailed = status === 'failed';
                  return (
                    <tr key={row._id} className={isFailed ? 'is-failed' : undefined}>
                      <td className="reminder-history-col-status">
                        <span className={`reminder-history-status reminder-history-status-${status || 'unknown'}`}>
                          <span className="reminder-history-status-dot" aria-hidden="true" />
                          {status || 'unknown'}
                        </span>
                      </td>
                      <td className="reminder-history-col-channel">
                        <span className="reminder-history-channel">{channel || '—'}</span>
                      </td>
                      <td className="reminder-history-col-rule">
                        {ruleLabel === '—' ? (
                          <span className="reminder-history-cell-text-muted">—</span>
                        ) : (
                          ruleLabel
                        )}
                      </td>
                      <td className="reminder-history-col-date">{formatDate(row.scheduledFor)}</td>
                      <td className="reminder-history-col-date">{formatDateTime(row.sentAt)}</td>
                      <td className="reminder-history-col-error">
                        {isFailed && row.error ? (
                          <span className="reminder-history-error">
                            <span className="reminder-history-error-icon" aria-hidden="true">
                              {ALERT_ICON}
                            </span>
                            {row.error}
                          </span>
                        ) : (
                          <span className="reminder-history-cell-text-muted">—</span>
                        )}
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