import { useEffect, useMemo, useState } from 'react';
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  deleteInvoice,
} from '../services/invoiceService';
import { getClients } from '../services/clientService';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceForm from '../components/invoices/InvoiceForm';
import ConfirmDialog from '../components/clients/ConfirmDialog';
import { formatApiError } from '../utils/errorMessage';
// The invoice table now displays the user-assigned `invoiceNumber` field
// returned by the API. Legacy invoices that pre-date the field render with
// an empty cell so the user can edit and add one.
import './InvoicesPage.css';

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return INR_FORMATTER.format(n);
}

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FILTERS = [
  { value: 'all',      label: 'All',      dot: 'all' },
  { value: 'pending',  label: 'Pending',  dot: 'pending' },
  { value: 'paid',     label: 'Paid',     dot: 'paid' },
  { value: 'overdue',  label: 'Overdue',  dot: 'overdue' },
];

const OUTSTANDING_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const PAID_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const OVERDUE_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const TOTAL_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

function isOverdue(invoice) {
  if (!invoice?.dueDate || invoice.status === 'paid') return false;
  const due = new Date(invoice.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function fetchInvoices() {
      try {
        setLoading(true);
        setError('');
        const data = await getInvoices();
        if (!cancelled) setInvoices(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, 'Failed to load invoices'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchInvoices();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchClientList() {
      try {
        const data = await getClients();
        if (!cancelled) setClients(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, 'Failed to load clients'));
      }
    }
    fetchClientList();
    return () => { cancelled = true; };
  }, []);

  const refreshInvoices = async () => {
    const data = await getInvoices();
    setInvoices(data);
  };

  const handleCreate = async (formData) => {
    try {
      setSubmitting(true);
      setError('');
      await createInvoice(formData);
      await refreshInvoices();
      setShowForm(false);
    } catch (err) {
      setError(formatApiError(err, 'Failed to create invoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(false);
  };

  const handleUpdate = async (formData) => {
    if (!editingInvoice) return;
    const id = editingInvoice._id;
    try {
      setSubmitting(true);
      setUpdatingId(id);
      setError('');
      await updateInvoice(id, formData);
      await refreshInvoices();
      setEditingInvoice(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update invoice'));
    } finally {
      setSubmitting(false);
      setUpdatingId(null);
    }
  };

  const handlePayClick = (invoice) => {
    setPendingAction({ type: 'pay', invoice });
  };

  const handleDeleteClick = (invoice) => {
    setPendingAction({ type: 'delete', invoice });
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { type, invoice } = pendingAction;
    const id = invoice._id;
    try {
      setError('');
      if (type === 'pay') {
        setPayingId(id);
        await markInvoicePaid(id);
      } else if (type === 'delete') {
        setDeletingId(id);
        await deleteInvoice(id);
      }
      await refreshInvoices();
      setPendingAction(null);
    } catch (err) {
      setError(
        formatApiError(
          err,
          type === 'pay' ? 'Failed to mark invoice as paid' : 'Failed to delete invoice'
        )
      );
    } finally {
      setPayingId(null);
      setDeletingId(null);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  const isConfirmingPay = pendingAction?.type === 'pay';
  const confirmBusy = Boolean(payingId) || Boolean(deletingId);

  // Derived from the loaded invoice list. No new backend calls.
  const stats = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter((i) => i.status === 'pending').length;
    const overdue = invoices.filter(isOverdue).length;
    const paidThisView = invoices.filter((i) => i.status === 'paid').length;
    const outstandingAmount = invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const paidAmount = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
    return { total, pending, overdue, paidThisView, outstandingAmount, paidAmount };
  }, [invoices]);

  // Client-side search + status filter.
  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter === 'pending' && inv.status !== 'pending') return false;
      if (statusFilter === 'paid' && inv.status !== 'paid') return false;
      if (statusFilter === 'overdue' && !isOverdue(inv)) return false;
      if (!q) return true;
      const name = (inv.client?.name || '').toLowerCase();
      const email = (inv.client?.email || '').toLowerCase();
      const amount = String(inv.amount ?? '');
      return (
        name.includes(q) ||
        email.includes(q) ||
        amount.includes(q) ||
        (typeof inv.invoiceNumber === 'string' && inv.invoiceNumber.toLowerCase().includes(q))
      );
    });
  }, [invoices, query, statusFilter]);

  const hasInvoices = invoices.length > 0;
  const isFiltering = hasInvoices && (query.trim() !== '' || statusFilter !== 'all');
  const formOpen = showForm || Boolean(editingInvoice);

  return (
    <div className="invoices-page">
      {/* Compact page header — hidden when the form is open to avoid a
          duplicate header above the Create Invoice screen. */}
      {!formOpen && (
        <section className="invoices-page-header">
          <div className="invoices-page-header-text">
            <p className="invoices-page-eyebrow">Workspace</p>
            <h1 className="invoices-page-title">Invoices</h1>
            <p className="invoices-page-subtitle">
              Track every invoice, monitor payment status, and manage outstanding balances.
            </p>
          </div>
          <div className="invoices-page-header-actions">
            <button
              type="button"
              className="btn btn-primary invoices-page-add-btn"
              onClick={() => setShowForm(true)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Invoice
            </button>
          </div>
        </section>
      )}

      {showForm && (
        <InvoiceForm
          key="create"
          initialValues={{ client: '', invoiceNumber: '', amount: '', dueDate: '', description: '' }}
          clients={clients}
          onSubmit={handleCreate}
          onCancel={handleCancelForm}
          submitting={submitting}
          serverError={error}
        />
      )}

      {editingInvoice && (
  <InvoiceForm
    key={`edit-${editingInvoice._id}`}
    initialValues={{
      client:
        typeof editingInvoice.client === 'object'
          ? editingInvoice.client._id
          : editingInvoice.client || '',
      invoiceNumber: editingInvoice.invoiceNumber || '',
      amount: editingInvoice.amount ?? '',
      dueDate: editingInvoice.dueDate ? editingInvoice.dueDate.slice(0, 10) : '',
      description: editingInvoice.description || '',
    }}
    mode="edit"
    isPaid={editingInvoice.status === 'paid'}
    clients={clients}
    onSubmit={handleUpdate}
    onCancel={handleCancelForm}
    submitting={submitting}
    serverError={error}
  />
      )}

      {/* Stats cards — top-level overview */}
      {!formOpen && (
      <section className="invoices-stats" aria-label="Invoice statistics">
        <article className="invoices-stat-card invoices-stat-card-outstanding">
          <span className="invoices-stat-card-icon" aria-hidden="true">{OUTSTANDING_ICON}</span>
          <div className="invoices-stat-card-body">
            <p className="invoices-stat-card-label">Outstanding</p>
            <p className="invoices-stat-card-value">{loading ? '—' : formatINR(stats.outstandingAmount)}</p>
            <p className="invoices-stat-card-helper">
              {loading
                ? 'Calculating…'
                : `${stats.pending} unpaid ${stats.pending === 1 ? 'invoice' : 'invoices'}`}
            </p>
          </div>
        </article>

        <article className="invoices-stat-card invoices-stat-card-paid">
          <span className="invoices-stat-card-icon" aria-hidden="true">{PAID_ICON}</span>
          <div className="invoices-stat-card-body">
            <p className="invoices-stat-card-label">Paid</p>
            <p className="invoices-stat-card-value">{loading ? '—' : stats.paidThisView}</p>
            <p className="invoices-stat-card-helper">
              {loading ? 'Calculating…' : `${formatINR(stats.paidAmount)} settled`}
            </p>
          </div>
        </article>

        <article className="invoices-stat-card invoices-stat-card-overdue">
          <span className="invoices-stat-card-icon" aria-hidden="true">{OVERDUE_ICON}</span>
          <div className="invoices-stat-card-body">
            <p className="invoices-stat-card-label">Overdue</p>
            <p className="invoices-stat-card-value invoices-stat-card-value-danger">{loading ? '—' : stats.overdue}</p>
            <p className="invoices-stat-card-helper">
              {loading
                ? 'Calculating…'
                : stats.overdue === 0
                  ? 'Nothing past due'
                  : `${stats.overdue} ${stats.overdue === 1 ? 'invoice needs' : 'invoices need'} attention`}
            </p>
          </div>
        </article>

        <article className="invoices-stat-card invoices-stat-card-total">
          <span className="invoices-stat-card-icon" aria-hidden="true">{TOTAL_ICON}</span>
          <div className="invoices-stat-card-body">
            <p className="invoices-stat-card-label">Total Invoices</p>
            <p className="invoices-stat-card-value">{loading ? '—' : stats.total}</p>
            <p className="invoices-stat-card-helper">
              {loading
                ? 'Calculating…'
                : `${formatINR(stats.outstandingAmount + stats.paidAmount)} billed`}
            </p>
          </div>
        </article>
      </section>
      )}

      {/* Modern toolbar — search + status filter chips */}
      {!formOpen && (
      <section className="invoices-toolbar" aria-label="Invoice toolbar">
        <div className="invoices-toolbar-search">
          <span className="invoices-toolbar-search-icon" aria-hidden="true">
            {SEARCH_ICON}
          </span>
          <input
            type="search"
            className="invoices-toolbar-search-input"
            placeholder="Search by client, invoice number, or amount"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search invoices"
            disabled={loading && !hasInvoices}
          />
        </div>

        <div
          className="invoices-toolbar-filters"
          role="tablist"
          aria-label="Filter invoices by status"
        >
          {FILTERS.map((f) => {
            const active = statusFilter === f.value;
            const count =
              f.value === 'all'     ? stats.total
              : f.value === 'pending' ? stats.pending
              : f.value === 'paid'    ? stats.paidThisView
              : f.value === 'overdue' ? stats.overdue
              : 0;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`invoices-filter-chip invoices-filter-chip-${f.dot}${active ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                <span className={`invoices-filter-dot invoices-filter-dot-${f.dot}`} aria-hidden="true" />
                {f.label}
                <span className="invoices-filter-chip-count">{loading ? '—' : count}</span>
              </button>
            );
          })}
        </div>

        <div className="invoices-toolbar-cta">
          <button
            type="button"
            className="btn btn-primary invoices-toolbar-add-btn"
            onClick={() => setShowForm(true)}
            disabled={formOpen}
          >
            {PLUS_ICON}
            New Invoice
          </button>
        </div>
      </section>
      )}

      {/* Premium table card — primary focus */}
      {!formOpen && (
      <section className="invoices-table-card">
        <header className="invoices-table-card-header">
          <div className="invoices-table-card-header-text">
            <h2 className="invoices-table-card-title">All Invoices</h2>
            <p className="invoices-table-card-subtitle">
              {loading
                ? 'Loading your invoice list…'
                : isFiltering
                  ? `Showing ${filteredInvoices.length} of ${stats.total} ${stats.total === 1 ? 'invoice' : 'invoices'}`
                  : `${stats.total} ${stats.total === 1 ? 'invoice' : 'invoices'} in your workspace`}
            </p>
          </div>
          {isFiltering && !loading && (
            <button
              type="button"
              className="invoices-clear-filter"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </button>
          )}
        </header>

        <InvoiceList
          invoices={filteredInvoices}
          loading={loading}
          error={error}
          onEdit={handleEditClick}
          onMarkPaid={handlePayClick}
          onDelete={handleDeleteClick}
          payingId={payingId}
          deletingId={deletingId}
          updatingId={updatingId}
          emptyTitle={isFiltering ? 'No invoices match your filters' : 'No invoices yet'}
          emptyBody={
            isFiltering
              ? 'Try a different search term or status filter.'
              : 'Create your first invoice to start tracking payments.'
          }
        />
      </section>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={isConfirmingPay ? 'Mark invoice as paid' : 'Delete invoice'}
        message={
          pendingAction
            ? (() => {
                const inv = pendingAction.invoice;
                const clientName = inv.client?.name;
                const amount = Number.isFinite(Number(inv.amount))
                  ? formatINR(inv.amount)
                  : null;
                if (isConfirmingPay) {
                  if (clientName && amount) {
                    return `Mark ${clientName}'s ${amount} invoice as paid? This action cannot be undone.`;
                  }
                  return `Mark this ${amount || ''} invoice as paid? This action cannot be undone.`.trim();
                }
                if (clientName && amount) {
                  return `Delete ${clientName}'s ${amount} invoice? This action cannot be undone.`;
                }
                return `Delete this ${amount || ''} invoice? This action cannot be undone.`.trim();
              })()
            : ''
        }
        confirmLabel={isConfirmingPay ? 'Mark Paid' : 'Delete'}
        busy={confirmBusy}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}