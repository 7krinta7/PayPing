import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getInvoices } from '../services/invoiceService';
import { listReminderHistory } from '../services/reminderHistoryService';
import { listReminderRules } from '../services/reminderRuleService';
import ReminderHistory from '../components/invoices/ReminderHistory';
import { formatApiError } from '../utils/errorMessage';
import './InvoiceDetailPage.css';

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

const BACK_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

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

/**
 * Is this invoice overdue? Returns true for pending invoices whose due
 * date is before today (UTC midnight). Same logic as the list page.
 */
function isOverdue(dueDate, status) {
  if (!dueDate || status === 'paid') return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Pick the visual status pill tone. "overdue" is a derived state — the
 * underlying `status` field on the invoice is "pending" but we surface
 * the overdue badge when the due date has passed.
 */
function statusPillTone(status, overdue) {
  if (overdue) return 'overdue';
  if (status === 'paid') return 'paid';
  return 'pending';
}

/**
 * Resolve a normalised client shape. The backend populates `client` with
 * a name/email projection for list responses; we mirror the same
 * defensive handling used by InvoiceList.jsx so this page degrades the
 * same way if the client has been deleted.
 */
function resolveClient(invoice) {
  const c = invoice?.client;
  if (!c) return { name: null, missing: true };
  if (typeof c === 'string') return { name: null, missing: true };
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  return { name: name || null, missing: !name };
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // We fetch all three resources in parallel (invoices, history, rules)
  // exactly like DashboardPage does for stats + invoices. The history
  // call is scoped server-side via `?invoice=<id>`.
  const [invoice, setInvoice] = useState(null);
  const [history, setHistory] = useState([]);
  const [ruleMap, setRuleMap] = useState({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setPageLoading(true);
        setPageError('');
        setHistoryLoading(true);
        setHistoryError('');

        // Kick off all three in parallel. The history endpoint is scoped
        // to this invoice server-side; the rules endpoint returns every
        // rule for the current user, which we shrink into a lookup map.
        const [allInvoices, historyRows, rules] = await Promise.all([
          getInvoices(),
          // Bound the per-invoice history fetch so a chatty invoice with
          // hundreds of reminders doesn't drag a huge payload into the
          // detail page. The full history remains accessible from the
          // Reminders dashboard.
          listReminderHistory({ invoice: id, limit: 25 }).catch((err) => {
            // Surface history failures distinctly so the invoice header can
            // still render even if /reminder-history is unavailable.
            throw err;
          }),
          listReminderRules().catch(() => [])
        ]);

        if (cancelled) return;

        const match = (allInvoices || []).find((inv) => inv._id === id) || null;
        setInvoice(match);
        setHistory(Array.isArray(historyRows) ? historyRows : []);
        const map = {};
        for (const r of rules || []) {
          if (r && r._id) map[r._id] = r;
        }
        setRuleMap(map);
      } catch (err) {
        if (cancelled) return;
        // If the invoices call itself fails, the page is unusable. If only
        // the history call failed, we still want the page to render — we
        // detect that by checking which call rejected.
        const message = formatApiError(err, 'Failed to load invoice');
        // Treat 404 on the invoices list (unlikely) or a missing match as
        // "not found". A 5xx on the history endpoint ends up here too —
        // we keep the message honest and let the user retry.
        if (err.config && err.config.url && err.config.url.includes('/reminder-history')) {
          setHistoryError(message);
          setHistoryLoading(false);
        } else {
          setPageError(message);
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
          setHistoryLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const client = useMemo(() => (invoice ? resolveClient(invoice) : null), [invoice]);
  const overdue = invoice ? isOverdue(invoice.dueDate, invoice.status) : false;
  const tone = invoice ? statusPillTone(invoice.status, overdue) : 'pending';
  const statusLabel = invoice
    ? tone === 'overdue' ? 'overdue' : invoice.status
    : 'pending';

  // Not-found: the page finished loading but the invoices list didn't
  // contain a row with this id.
  const notFound = !pageLoading && !pageError && !invoice;

  return (
    <div className="invoice-detail-page">
      <Link
        to="/invoices"
        className="invoice-detail-back"
        aria-label="Back to invoices"
      >
        <span className="invoice-detail-back-icon" aria-hidden="true">
          {BACK_ICON}
        </span>
        Back to invoices
      </Link>

      {/* Page-level error — block the whole page if invoices failed. */}
      {pageError && (
        <div className="alert alert-error" role="alert">
          {pageError}
        </div>
      )}

      {/* Not found — honest empty state, not a fabricated invoice. */}
      {notFound && (
        <div className="invoice-detail-not-found">
          <p className="invoice-detail-not-found-title">Invoice not found</p>
          <p className="invoice-detail-not-found-body">
            We couldn&apos;t find an invoice with that id in your workspace. It may have
            been deleted, or the link is incorrect.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/invoices', { replace: true })}
          >
            Back to invoices
          </button>
        </div>
      )}

      {/* Invoice header */}
      {(pageLoading || invoice) && !notFound && (
        <section className="invoice-detail-header" aria-label="Invoice summary">
          <div className="invoice-detail-header-text">
            <p className="invoice-detail-eyebrow">Invoice</p>
            {pageLoading || !invoice ? (
              <>
                <span className="invoice-detail-skeleton-title" />
                <span className="invoice-detail-skeleton-subtitle" />
              </>
            ) : (
              <>
                <h1 className="invoice-detail-title">
                  {client?.name ? `Invoice for ${client.name}` : 'Invoice'}
                </h1>
                <p className="invoice-detail-client">
                  {client?.missing
                    ? 'Client record is missing'
                    : client?.name || 'Unnamed client'}
                </p>
              </>
            )}
          </div>
          <div className="invoice-detail-status">
            {!pageLoading && invoice && (
              <span
                className={`invoice-detail-status-pill invoice-detail-status-pill-${tone}`}
                aria-label={`Status: ${statusLabel}`}
              >
                <span className="invoice-detail-status-dot" aria-hidden="true" />
                {statusLabel}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Meta grid */}
      {(pageLoading || invoice) && !notFound && (
        <section className="invoice-detail-meta" aria-label="Invoice details">
          <div className="invoice-detail-meta-cell">
            <span className="invoice-detail-meta-label">Amount</span>
            {pageLoading || !invoice ? (
              <span className="invoice-detail-skeleton-cell invoice-detail-skeleton-cell-amount" />
            ) : (
              <span className="invoice-detail-meta-value">{formatINR(invoice.amount)}</span>
            )}
          </div>
          <div className="invoice-detail-meta-cell">
            <span className="invoice-detail-meta-label">Due date</span>
            {pageLoading || !invoice ? (
              <span className="invoice-detail-skeleton-cell invoice-detail-skeleton-cell-date" />
            ) : (
              <span
                className={`invoice-detail-meta-value${overdue && invoice.status === 'pending' ? ' invoice-detail-meta-value-danger' : ''}`}
              >
                {formatDate(invoice.dueDate)}
              </span>
            )}
          </div>
          <div className="invoice-detail-meta-cell">
            <span className="invoice-detail-meta-label">Invoice #</span>
            {pageLoading || !invoice ? (
              <span className="invoice-detail-skeleton-cell invoice-detail-skeleton-cell-invoice" />
            ) : (
              <span className="invoice-detail-meta-value invoice-detail-meta-value-mono">
                {typeof invoice.invoiceNumber === 'string' && invoice.invoiceNumber.trim()
                  ? invoice.invoiceNumber
                  : <span className="invoice-detail-meta-value-muted">Not assigned</span>}
              </span>
            )}
          </div>
          <div className="invoice-detail-meta-cell">
            <span className="invoice-detail-meta-label">Client</span>
            {pageLoading || !invoice ? (
              <span className="invoice-detail-skeleton-cell" />
            ) : (
              <span className="invoice-detail-meta-value">
                {client?.missing ? (
                  <span className="invoice-detail-meta-value-muted">Deleted client</span>
                ) : (
                  client?.name || '—'
                )}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Description */}
      {invoice && invoice.description && !notFound && (
        <section className="invoice-detail-description" aria-label="Invoice description">
          <span className="invoice-detail-description-label">Description</span>
          <p className="invoice-detail-description-body">{invoice.description}</p>
        </section>
      )}

      {/* Reminder History — the Phase 4D section. */}
      {!notFound && !pageError && (
        <ReminderHistory
          rows={history}
          loading={historyLoading}
          error={historyError}
          ruleMap={ruleMap}
        />
      )}
    </div>
  );
}