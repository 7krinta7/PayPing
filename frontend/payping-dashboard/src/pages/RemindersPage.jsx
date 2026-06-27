import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getReminderOverview,
  getUpcomingReminders,
  listReminderHistory,
} from '../services/reminderHistoryService';
import { listReminderRules } from '../services/reminderRuleService';
import ReminderOverviewStats from '../components/reminders/ReminderOverviewStats';
import ReminderRecentActivity from '../components/reminders/ReminderRecentActivity';
import ReminderUpcomingQueue from '../components/reminders/ReminderUpcomingQueue';
import ReminderRulesPreview from '../components/reminders/ReminderRulesPreview';
import { formatApiError } from '../utils/errorMessage';
import './RemindersPage.css';

const BELL_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ARROW_RIGHT_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const HISTORY_LIMIT = 10;

/**
 * RemindersPage — operational dashboard for the reminder system.
 *
 * Phase 8 redesign. The page reads top-to-bottom:
 *   1. Page header (title + subtitle + Manage Reminder Rules CTA)
 *   2. Overview stats grid (4 real backend counters)
 *   3. Two-column row:
 *        - Recent Reminder Activity (last HISTORY_LIMIT history rows)
 *        - Upcoming Reminder Queue (preview-only projection)
 *   4. Reminder Rules Preview (compact table + manage button)
 *
 * All four data sources are fetched in parallel. A failure in any one
 * becomes an isolated section-level error state — the rest of the
 * page keeps rendering with whatever did succeed.
 */
export default function RemindersPage() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [rules, setRules] = useState([]);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);

  const [overviewError, setOverviewError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [upcomingError, setUpcomingError] = useState('');
  const [rulesError, setRulesError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fire all four in parallel. Each `setError` only fires if its
      // own endpoint rejects, so a single failure doesn't blank the
      // rest of the dashboard.
      const fetchOverview = getReminderOverview()
        .then((data) => {
          if (!cancelled) setOverview(data || null);
        })
        .catch((err) => {
          if (!cancelled) {
            setOverviewError(
              formatApiError(err, 'Failed to load reminder overview')
            );
          }
        })
        .finally(() => {
          if (!cancelled) setOverviewLoading(false);
        });

      const fetchHistory = listReminderHistory({ limit: HISTORY_LIMIT })
        .then((rows) => {
          if (!cancelled) setHistory(Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          if (!cancelled) {
            setHistoryError(
              formatApiError(err, 'Failed to load recent reminders')
            );
          }
        })
        .finally(() => {
          if (!cancelled) setHistoryLoading(false);
        });

      const fetchUpcoming = getUpcomingReminders()
        .then((rows) => {
          if (!cancelled) setUpcoming(Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          if (!cancelled) {
            setUpcomingError(
              formatApiError(err, 'Failed to load upcoming reminders')
            );
          }
        })
        .finally(() => {
          if (!cancelled) setUpcomingLoading(false);
        });

      const fetchRules = listReminderRules()
        .then((rows) => {
          if (!cancelled) setRules(Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          if (!cancelled) {
            setRulesError(
              formatApiError(err, 'Failed to load reminder rules')
            );
          }
        })
        .finally(() => {
          if (!cancelled) setRulesLoading(false);
        });

      await Promise.allSettled([fetchOverview, fetchHistory, fetchUpcoming, fetchRules]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a {id -> rule} lookup so the recent-activity table can render
  // rule names without N+1 lookups. Same pattern InvoiceDetailPage uses.
  const ruleMap = rules.reduce((acc, rule) => {
    if (rule && rule._id) acc[rule._id] = rule;
    return acc;
  }, {});

  return (
    <div className="reminders-dashboard-page">
      <section className="reminders-dashboard-header">
        <div className="reminders-dashboard-header-text">
          <p className="reminders-dashboard-eyebrow">
            <span className="reminders-dashboard-eyebrow-icon" aria-hidden="true">
              {BELL_ICON}
            </span>
            Workspace
          </p>
          <h1 className="reminders-dashboard-title">Reminders</h1>
          <p className="reminders-dashboard-subtitle">
            Operational view of the reminder system. See what has been sent, what is queued,
            and the rules driving it all.
          </p>
        </div>
        <div className="reminders-dashboard-header-actions">
          <button
            type="button"
            className="btn btn-secondary reminders-dashboard-manage-btn"
            onClick={() => navigate('/reminders/rules')}
          >
            Manage Reminder Rules
            <span className="reminders-dashboard-manage-icon" aria-hidden="true">
              {ARROW_RIGHT_ICON}
            </span>
          </button>
        </div>
      </section>

      {/* 1. Overview stats */}
      <ReminderOverviewStats
        stats={overview}
        loading={overviewLoading}
        error={overviewError}
      />

      {/* 2 + 3. Two-column row */}
      <div className="reminders-dashboard-split">
        <ReminderRecentActivity
          rows={history}
          loading={historyLoading}
          error={historyError}
          ruleMap={ruleMap}
        />
        <ReminderUpcomingQueue
          rows={upcoming}
          loading={upcomingLoading}
          error={upcomingError}
        />
      </div>

      {/* 4. Reminder Rules Preview */}
      <ReminderRulesPreview
        rules={rules}
        loading={rulesLoading}
        error={rulesError}
      />
    </div>
  );
}