import { useNavigate } from 'react-router-dom';
import './ReminderRulesPreview.css';

const ARROW_RIGHT_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/**
 * Build the human label for an `offsetDays` value.
 * Mirrors ReminderRuleList.jsx so the two surfaces agree.
 */
function describeOffset(offsetDays) {
  const n = Number(offsetDays);
  if (!Number.isFinite(n)) return 'On due date';
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} before due`;
  if (n > 0) return `${n} day${n === 1 ? '' : 's'} after due`;
  return 'On due date';
}

function describeOffsetTone(offsetDays) {
  const n = Number(offsetDays);
  if (!Number.isFinite(n) || n === 0) return 'on';
  return n < 0 ? 'before' : 'after';
}

function resolveRuleName(rule) {
  if (!rule) return '—';
  const name = typeof rule.name === 'string' ? rule.name.trim() : '';
  return name || 'Untitled rule';
}

/**
 * ReminderRulesPreview — compact rule list for the dashboard.
 *
 * Pure component: no fetching. Parent supplies `rules`, `loading`,
 * `error`. Renders:
 *   - loading → skeleton rows
 *   - error   → reuses the global `.alert .alert-error` class
 *   - empty   → honest empty state
 *   - data    → compact table (Rule / Offset / Enabled) plus a
 *               "Manage Reminder Rules" button that navigates to the
 *               dedicated rule editor.
 */
export default function ReminderRulesPreview({
  rules = [],
  loading = false,
  error = ''
}) {
  const navigate = useNavigate();

  const goToRules = () => navigate('/reminders/rules');

  return (
    <section className="reminder-rules-preview" aria-label="Reminder rules preview">
      <div className="reminder-rules-preview-card">
        <header className="reminder-rules-preview-card-header">
          <div className="reminder-rules-preview-card-header-text">
            <h2 className="reminder-rules-preview-card-title">Reminder Rules</h2>
            <p className="reminder-rules-preview-card-subtitle">
              Rules currently configured to send reminders for your invoices.
            </p>
          </div>
          {!loading && !error && (
            <span className="reminder-rules-preview-card-meta">
              {rules.length === 0
                ? 'No rules'
                : `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}`}
              <span className="reminder-rules-preview-card-meta-count" aria-hidden="true">
                {rules.length}
              </span>
            </span>
          )}
        </header>

        {loading && (
          <div className="reminder-rules-preview-table-wrap" aria-busy="true">
            <table className="reminder-rules-preview-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Offset</th>
                  <th className="reminder-rules-preview-col-enabled">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((i) => (
                  <tr key={i} className="reminder-rules-preview-skeleton-row">
                    <td><span className="reminder-rules-preview-skeleton reminder-rules-preview-skeleton-name" /></td>
                    <td><span className="reminder-rules-preview-skeleton reminder-rules-preview-skeleton-offset" /></td>
                    <td className="reminder-rules-preview-col-enabled">
                      <span className="reminder-rules-preview-skeleton reminder-rules-preview-skeleton-toggle" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && error && (
          <div className="reminder-rules-preview-error-wrap">
            <div className="alert alert-error" role="alert">{error}</div>
          </div>
        )}

        {!loading && !error && rules.length === 0 && (
          <div className="reminder-rules-preview-empty">
            <p className="reminder-rules-preview-empty-title">No reminder rules yet</p>
            <p className="reminder-rules-preview-empty-body">
              PayPing will continue using the default overdue reminder until you create your
              first reminder rule.
            </p>
          </div>
        )}

        {!loading && !error && rules.length > 0 && (
          <div className="reminder-rules-preview-table-wrap">
            <table className="reminder-rules-preview-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Offset</th>
                  <th className="reminder-rules-preview-col-enabled">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const offsetText = describeOffset(rule.offsetDays);
                  const offsetTone = describeOffsetTone(rule.offsetDays);
                  const enabled = Boolean(rule.enabled);
                  return (
                    <tr key={rule._id}>
                      <td className="reminder-rules-preview-cell-rule">
                        {resolveRuleName(rule)}
                      </td>
                      <td>
                        <span className={`reminder-rules-preview-offset-chip reminder-rules-preview-offset-chip-${offsetTone}`}>
                          {offsetText}
                        </span>
                      </td>
                      <td className="reminder-rules-preview-col-enabled">
                        <span
                          className={`reminder-rules-preview-enabled-pill reminder-rules-preview-enabled-pill-${enabled ? 'on' : 'off'}`}
                          aria-label={enabled ? 'Enabled' : 'Disabled'}
                        >
                          <span className="reminder-rules-preview-enabled-dot" aria-hidden="true" />
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="reminder-rules-preview-footer">
          <button
            type="button"
            className="btn btn-secondary reminder-rules-preview-manage-btn"
            onClick={goToRules}
          >
            Manage Reminder Rules
            <span className="reminder-rules-preview-manage-icon" aria-hidden="true">
              {ARROW_RIGHT_ICON}
            </span>
          </button>
        </footer>
      </div>
    </section>
  );
}