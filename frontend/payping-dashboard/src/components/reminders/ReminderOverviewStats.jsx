import './ReminderOverviewStats.css';

const ICONS = {
  rules: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  sent: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  failed: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatCount(value) {
  if (value === undefined || value === null) return '—';
  return NUMBER_FORMATTER.format(value);
}

/**
 * Contextual helper line for each stat. Returns honest copy based on
 * the actual value — never fabricates a number.
 */
function helperFor(key, value, loading) {
  if (loading) return 'Loading…';
  if (value === undefined || value === null) return 'No data available';
  switch (key) {
    case 'activeReminderRules':
      if (value === 0) return 'No active rules — create one to get started';
      if (value === 1) return '1 rule is currently sending reminders';
      return `${NUMBER_FORMATTER.format(value)} rules are currently sending reminders`;
    case 'remindersSentToday':
      if (value === 0) return 'Nothing sent yet today';
      if (value === 1) return '1 reminder delivered today';
      return `${NUMBER_FORMATTER.format(value)} reminders delivered today`;
    case 'failedDeliveries':
      if (value === 0) return 'All deliveries succeeded — great work';
      if (value === 1) return '1 delivery failed — review history';
      return `${NUMBER_FORMATTER.format(value)} deliveries failed — review history`;
    case 'pendingInvoices':
      if (value === 0) return "You're all caught up";
      if (value === 1) return '1 invoice awaiting payment';
      return `${NUMBER_FORMATTER.format(value)} invoices awaiting payment`;
    default:
      return '';
  }
}

const CARDS = [
  { key: 'activeReminderRules', label: 'Active Reminder Rules', icon: 'rules' },
  { key: 'remindersSentToday', label: 'Reminders Sent Today', icon: 'sent' },
  { key: 'failedDeliveries', label: 'Failed Deliveries', icon: 'failed' },
  { key: 'pendingInvoices', label: 'Pending Invoices', icon: 'pending' },
];

/**
 * ReminderOverviewStats — pure presentational four-card stat grid.
 *
 * Parent (RemindersPage) supplies `stats`, `loading`, `error`. The
 * component renders:
 *   - loading → "Loading…" placeholders that keep the card frame stable.
 *   - error   → reuses the global `.alert .alert-error` class.
 *   - data    → real numbers from the backend, no fabrication.
 */
export default function ReminderOverviewStats({
  stats = null,
  loading = false,
  error = ''
}) {
  if (error) {
    return (
      <div className="reminder-overview-stats-error" role="alert">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="reminder-overview-stats" aria-busy={loading}>
      {CARDS.map(({ key, label, icon }) => {
        const value = stats ? stats[key] : undefined;
        return (
          <div key={key} className={`reminder-overview-stat-card reminder-overview-stat-card-${key}`}>
            <span className="reminder-overview-stat-icon" aria-hidden="true">
              {ICONS[icon]}
            </span>
            <div className="reminder-overview-stat-body">
              <span className="reminder-overview-stat-label">{label}</span>
              <span className="reminder-overview-stat-value">
                {loading ? 'Loading…' : formatCount(value)}
              </span>
              <span className="reminder-overview-stat-helper">
                {helperFor(key, value, loading)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}