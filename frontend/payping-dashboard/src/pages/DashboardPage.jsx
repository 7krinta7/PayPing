import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';
import { getPendingInvoices } from '../services/invoiceService';
import './DashboardPage.css';

const STAT_CARDS = [
  {
    key: 'totalClients',
    label: 'Total Clients',
    format: 'number',
    icon: 'users',
  },
  {
    key: 'pendingInvoices',
    label: 'Pending Invoices',
    format: 'number',
    icon: 'file-text',
  },
  {
    key: 'overdueInvoices',
    label: 'Overdue Invoices',
    format: 'number',
    icon: 'alert-circle',
  },
  {
    key: 'outstandingAmount',
    label: 'Outstanding Amount',
    format: 'currency',
    icon: 'dollar-sign',
  },
];

const STAT_ICONS = {
  users: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'file-text': (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  'alert-circle': (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  'dollar-sign': (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

const EMPTY_USERS = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EMPTY_INVOICE = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatValue(value, format) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  if (format === 'currency') return CURRENCY_FORMATTER.format(value);
  return NUMBER_FORMATTER.format(value);
}

// Build a contextual helper line for each stat from the actual data.
function statHelper(key, value, loading) {
  if (loading) return 'Loading…';
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'No data available';
  }
  switch (key) {
    case 'totalClients':
      if (value === 0) return 'Add your first client to get started';
      if (value === 1) return '1 active client';
      return `${NUMBER_FORMATTER.format(value)} active clients`;
    case 'pendingInvoices':
      if (value === 0) return "You're all caught up";
      if (value === 1) return '1 invoice awaiting payment';
      return `${NUMBER_FORMATTER.format(value)} invoices awaiting payment`;
    case 'overdueInvoices':
      if (value === 0) return 'Nothing overdue — great work';
      if (value === 1) return '1 invoice needs your attention';
      return `${NUMBER_FORMATTER.format(value)} invoices need your attention`;
    case 'outstandingAmount':
      if (value === 0) return 'No outstanding balance';
      return 'Total receivable across all pending invoices';
    default:
      return '';
  }
}

function formatToday() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function formatDueDate(iso) {
  if (!iso) return '—';
  // Backend returns ISO timestamp; render the YYYY-MM-DD slice for consistency
  // with the rest of the app.
  return typeof iso === 'string' ? iso.slice(0, 10) : '—';
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState('');

  // Stats fetch.
  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        setStatsLoading(true);
        setStatsError('');
        const data = await getDashboardStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setStatsError(err.response?.data?.message || 'Failed to load dashboard stats');
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  // Pending invoices fetch — for the Upcoming Due Invoices section.
  useEffect(() => {
    let cancelled = false;
    async function fetchInvoices() {
      try {
        setInvoicesLoading(true);
        setInvoicesError('');
        const data = await getPendingInvoices();
        if (!cancelled) setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setInvoicesError(err.response?.data?.message || 'Failed to load invoices');
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    }
    fetchInvoices();
    return () => { cancelled = true; };
  }, []);

  // Sort by due date ascending and take the next 5. Only invoices that
  // actually exist in the backend are shown.
  const upcomingInvoices = [...invoices]
    .filter((inv) => inv && inv.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  return (
    <div className="dashboard-page dashboard-home">
      {/* 1. Welcome */}
      <section className="dashboard-home-header">
        <div>
          <p className="dashboard-home-eyebrow">Today</p>
          <h1 className="dashboard-home-title">Welcome back!</h1>
          <p className="dashboard-home-subtitle">
            Here&apos;s what&apos;s happening with your invoices today.
          </p>
        </div>
        <div className="dashboard-home-meta">
          <time className="dashboard-home-date" dateTime={new Date().toISOString()}>
            {formatToday()}
          </time>
        </div>
      </section>

      {/* 2. Stats */}
      {statsError && (
        <div className="alert alert-error dashboard-stats-error" role="alert">
          {statsError}
        </div>
      )}

      <div className="dashboard-stats-grid" aria-busy={statsLoading}>
        {STAT_CARDS.map(({ key, label, format, icon }) => (
          <div key={key} className="stat-card">
            <div className="stat-card-top">
              <span className={`stat-card-icon stat-card-icon-${key}`} aria-hidden="true">
                {STAT_ICONS[icon]}
              </span>
            </div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">
              {statsLoading ? 'Loading…' : formatValue(stats?.[key], format)}
            </div>
            <div className="stat-card-helper">
              {statHelper(key, stats?.[key], statsLoading)}
            </div>
          </div>
        ))}
      </div>

      {/* 3 + 4. Recent Activity + Quick Actions (2:1 row) */}
      <div className="dashboard-home-split">
        <section className="dashboard-card dashboard-activity-card" aria-labelledby="recent-activity-title">
          <header className="dashboard-card-header">
            <h2 id="recent-activity-title" className="dashboard-card-title">Recent Activity</h2>
            <span className="dashboard-card-link-muted">Last events</span>
          </header>
          <div className="dashboard-empty-state">
            <span className="dashboard-empty-state-icon" aria-hidden="true">
              {EMPTY_USERS}
            </span>
            <p className="dashboard-empty-state-title">No recent activity yet.</p>
            <p className="dashboard-empty-state-body">
              Client creation, invoices, payments and reminders will appear here.
            </p>
          </div>
        </section>

        <section className="dashboard-card dashboard-quick-actions" aria-labelledby="quick-actions-title">
          <header className="dashboard-card-header">
            <h2 id="quick-actions-title" className="dashboard-card-title">Quick Actions</h2>
            <span className="dashboard-card-link-muted">Common tasks</span>
          </header>
          <div className="quick-actions-list">
            <button
              type="button"
              className="btn btn-primary quick-action-btn"
              onClick={() => navigate('/clients')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Add Client
            </button>
            <button
              type="button"
              className="btn btn-secondary quick-action-btn"
              onClick={() => navigate('/invoices')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Create Invoice
            </button>
          </div>
        </section>
      </div>

      {/* 5. Upcoming Due Invoices */}
      <section className="dashboard-card dashboard-reminders-card" aria-labelledby="upcoming-invoices-title">
        <header className="dashboard-card-header dashboard-card-header-padded">
          <h2 id="upcoming-invoices-title" className="dashboard-card-title">Upcoming Due Invoices</h2>
          <span className="dashboard-card-link-muted">Next 5 pending</span>
        </header>

        {invoicesError ? (
          <div className="alert alert-error dashboard-card-padded" role="alert">
            {invoicesError}
          </div>
        ) : invoicesLoading ? (
          <div className="reminders-table-wrap" aria-busy="true">
            <table className="reminders-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((i) => (
                  <tr key={i} className="reminders-skeleton-row">
                    <td><span className="reminders-skeleton" /></td>
                    <td><span className="reminders-skeleton" /></td>
                    <td><span className="reminders-skeleton" /></td>
                    <td><span className="reminders-skeleton" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : upcomingInvoices.length === 0 ? (
          <div className="dashboard-empty-state">
            <span className="dashboard-empty-state-icon" aria-hidden="true">
              {EMPTY_INVOICE}
            </span>
            <p className="dashboard-empty-state-title">No upcoming due invoices.</p>
            <p className="dashboard-empty-state-body">
              You&apos;re all caught up. Create a new invoice when you&apos;re ready.
            </p>
          </div>
        ) : (
          <div className="reminders-table-wrap">
            <table className="reminders-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="reminders-table-actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingInvoices.map((invoice) => {
                  const status = invoice.status || 'pending';
                  const clientName =
                    (typeof invoice.client === 'object' && invoice.client?.name) ||
                    invoice.client ||
                    '—';
                  return (
                    <tr key={invoice._id}>
                      <td>{clientName}</td>
                      <td>{CURRENCY_FORMATTER.format(invoice.amount ?? 0)}</td>
                      <td>{formatDueDate(invoice.dueDate)}</td>
                      <td>
                        <span className={`reminders-status reminders-status-${status}`}>
                          {status}
                        </span>
                      </td>
                      <td className="reminders-table-actions-col">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary reminders-action-btn"
                          onClick={() => navigate('/invoices')}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}