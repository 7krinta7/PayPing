import './ReminderRuleList.css';

const EDIT_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

const EMPTY_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
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

/**
 * Build the human label for a `offsetDays` value.
 *   < 0 → "{N} days before due"
 *   = 0 → "On due date"
 *   > 0 → "{N} days after due"
 */
function describeOffset(offsetDays) {
  const n = Number(offsetDays);
  if (!Number.isFinite(n)) return 'On due date';
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} before due`;
  if (n > 0) return `${n} day${n === 1 ? '' : 's'} after due`;
  return 'On due date';
}

/**
 * Map offsetDays to a tone so the chip colour signals "before" (good),
 * "on" (neutral), "after" (warning). All reuse existing tokens.
 */
function describeOffsetTone(offsetDays) {
  const n = Number(offsetDays);
  if (!Number.isFinite(n) || n === 0) return 'on';
  return n < 0 ? 'before' : 'after';
}

/**
 * ReminderRuleList — presentational list for reminder rules.
 *
 * Pure component: no fetching. The parent (`RemindersPage`) supplies
 * `rules`, `loading`, `error`, and the per-row callbacks. The component
 * renders the appropriate state in each case:
 *
 *   - loading → skeleton rows that match the final row footprint.
 *   - error   → reuses the global `.alert.alert-error` class.
 *   - empty   → dashed-border empty card with the brief's exact copy.
 *   - data    → desktop table; mobile cards at ≤ 640px.
 *
 * No fabricated rows, no fake data. Every value rendered comes from
 * the rule document or its absence.
 */
export default function ReminderRuleList({
  rules = [],
  loading = false,
  error = '',
  onEdit,
  onDelete,
  onToggle,
  togglingId = null,
  deletingId = null,
}) {
  if (loading) {
    return (
      <div className="reminder-rule-list-skeleton-wrap" aria-busy="true">
        <table className="reminder-rule-table">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Offset</th>
              <th>Channel</th>
              <th>Enabled</th>
              <th className="reminder-rule-table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i} className="reminder-rule-skeleton-row">
                <td>
                  <span className="reminder-rule-skeleton reminder-rule-skeleton-name" />
                </td>
                <td><span className="reminder-rule-skeleton reminder-rule-skeleton-offset" /></td>
                <td><span className="reminder-rule-skeleton reminder-rule-skeleton-channel" /></td>
                <td><span className="reminder-rule-skeleton reminder-rule-skeleton-toggle" /></td>
                <td className="reminder-rule-table-actions-col">
                  <span className="reminder-rule-skeleton reminder-rule-skeleton-action" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reminder-rule-list-error-wrap">
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="reminder-rule-list-empty-state">
        <span className="reminder-rule-list-empty-icon" aria-hidden="true">
          {EMPTY_ICON}
        </span>
        <p className="reminder-rule-list-empty-title">No reminder rules yet</p>
        <p className="reminder-rule-list-empty-body">
          PayPing will continue using the default overdue reminder until you create your first reminder rule.
        </p>
      </div>
    );
  }

  return (
    <div className="reminder-rule-list">
      {/* Desktop / tablet table view */}
      <table className="reminder-rule-table">
        <thead>
          <tr>
            <th className="reminder-rule-table-name-col">Rule Name</th>
            <th>Offset</th>
            <th>Channel</th>
            <th>Enabled</th>
            <th className="reminder-rule-table-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => {
            const id = rule._id;
            const isToggling = togglingId === id;
            const isDeleting = deletingId === id;
            const rowBusy = isToggling || isDeleting;
            const name = typeof rule.name === 'string' && rule.name.trim()
              ? rule.name.trim()
              : 'Untitled rule';
            const secondary = `Created ${formatDate(rule.createdAt)}`;
            const offsetText = describeOffset(rule.offsetDays);
            const offsetTone = describeOffsetTone(rule.offsetDays);
            const channel = (rule.channel || 'email').toLowerCase();

            return (
              <tr key={id} aria-busy={rowBusy} className="reminder-rule-table-row">
                <td className="reminder-rule-table-name-cell">
                  <span className="reminder-rule-name-block">
                    <span className="reminder-rule-name-text">{name}</span>
                    <span className="reminder-rule-name-secondary">{secondary}</span>
                  </span>
                </td>
                <td>
                  <span className={`reminder-rule-offset-chip reminder-rule-offset-chip-${offsetTone}`}>
                    {offsetText}
                  </span>
                </td>
                <td>
                  <span className="reminder-rule-channel">
                    <span className="reminder-rule-channel-icon" aria-hidden="true">
                      {MAIL_ICON}
                    </span>
                    Email
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(rule.enabled)}
                    aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    disabled={rowBusy}
                    onClick={() => onToggle?.(rule)}
                    className={`reminder-rule-toggle${rule.enabled ? ' is-on' : ''}${rowBusy ? ' is-disabled' : ''}`}
                  >
                    {isToggling ? (
                      <span className="reminder-rule-toggle-spinner" aria-hidden="true" />
                    ) : (
                      <span className="reminder-rule-toggle-knob" aria-hidden="true" />
                    )}
                  </button>
                </td>
                <td className="reminder-rule-table-actions-col">
                  <div className="reminder-rule-table-actions">
                    <button
                      type="button"
                      className="reminder-rule-icon-btn reminder-rule-icon-btn-edit"
                      onClick={() => onEdit?.(rule)}
                      disabled={rowBusy}
                      aria-label="Edit rule"
                    >
                      {EDIT_ICON}
                    </button>
                    <button
                      type="button"
                      className="reminder-rule-icon-btn reminder-rule-icon-btn-delete"
                      onClick={() => onDelete?.(rule)}
                      disabled={rowBusy}
                      aria-label={isDeleting ? 'Deleting...' : 'Delete rule'}
                    >
                      {isDeleting ? (
                        <span className="reminder-rule-icon-btn-spinner" aria-hidden="true" />
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

      {/* Mobile cards view (≤ 640px) */}
      <ul className="reminder-rule-cards" aria-label="Reminder rules">
        {rules.map((rule) => {
          const id = rule._id;
          const isToggling = togglingId === id;
          const isDeleting = deletingId === id;
          const rowBusy = isToggling || isDeleting;
          const name = typeof rule.name === 'string' && rule.name.trim()
            ? rule.name.trim()
            : 'Untitled rule';
          const offsetText = describeOffset(rule.offsetDays);
          const offsetTone = describeOffsetTone(rule.offsetDays);

          return (
            <li key={id} className="reminder-rule-card" aria-busy={rowBusy}>
              <div className="reminder-rule-card-head">
                <div className="reminder-rule-card-head-text">
                  <span className="reminder-rule-card-name">{name}</span>
                  <span className="reminder-rule-card-secondary">
                    Created {formatDate(rule.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(rule.enabled)}
                  aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  disabled={rowBusy}
                  onClick={() => onToggle?.(rule)}
                  className={`reminder-rule-toggle${rule.enabled ? ' is-on' : ''}${rowBusy ? ' is-disabled' : ''}`}
                >
                  {isToggling ? (
                    <span className="reminder-rule-toggle-spinner" aria-hidden="true" />
                  ) : (
                    <span className="reminder-rule-toggle-knob" aria-hidden="true" />
                  )}
                </button>
              </div>

              <div className="reminder-rule-card-meta">
                <div className="reminder-rule-card-meta-item">
                  <span className="reminder-rule-card-meta-label">Offset</span>
                  <span className={`reminder-rule-offset-chip reminder-rule-offset-chip-${offsetTone}`}>
                    {offsetText}
                  </span>
                </div>
                <div className="reminder-rule-card-meta-item">
                  <span className="reminder-rule-card-meta-label">Channel</span>
                  <span className="reminder-rule-channel">
                    <span className="reminder-rule-channel-icon" aria-hidden="true">
                      {MAIL_ICON}
                    </span>
                    Email
                  </span>
                </div>
              </div>

              <div className="reminder-rule-card-actions">
                <button
                  type="button"
                  className="reminder-rule-icon-btn reminder-rule-icon-btn-edit"
                  onClick={() => onEdit?.(rule)}
                  disabled={rowBusy}
                  aria-label="Edit rule"
                >
                  {EDIT_ICON}
                </button>
                <button
                  type="button"
                  className="reminder-rule-icon-btn reminder-rule-icon-btn-delete"
                  onClick={() => onDelete?.(rule)}
                  disabled={rowBusy}
                  aria-label={isDeleting ? 'Deleting...' : 'Delete rule'}
                >
                  {isDeleting ? (
                    <span className="reminder-rule-icon-btn-spinner" aria-hidden="true" />
                  ) : (
                    DELETE_ICON
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
