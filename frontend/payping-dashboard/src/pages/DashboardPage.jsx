import { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/dashboardService';
import './DashboardPage.css';

const STAT_CARDS = [
  { key: 'totalClients', label: 'Total Clients', format: 'number' },
  { key: 'pendingInvoices', label: 'Pending Invoices', format: 'number' },
  { key: 'overdueInvoices', label: 'Overdue Invoices', format: 'number' },
  { key: 'outstandingAmount', label: 'Outstanding Amount', format: 'currency' }
];

function formatValue(value, format) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        setLoading(true);
        setError('');
        const data = await getDashboardStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <h1>Dashboard</h1>
        <p className="muted">Overview of your clients and invoices.</p>
      </div>

      {error && (
        <div className="alert alert-error dashboard-stats-error" role="alert">
          {error}
        </div>
      )}

      <div className="dashboard-stats-grid" aria-busy={loading}>
        {STAT_CARDS.map(({ key, label, format }) => (
          <div key={key} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">
              {loading ? 'Loading…' : formatValue(stats?.[key], format)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}