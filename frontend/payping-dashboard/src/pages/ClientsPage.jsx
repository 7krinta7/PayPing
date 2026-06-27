import { useEffect, useMemo, useState } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../services/clientService';
import ClientList from '../components/clients/ClientList';
import ClientForm from '../components/clients/ClientForm';
import ConfirmDialog from '../components/clients/ConfirmDialog';
import { formatApiError } from '../utils/errorMessage';
import './ClientsPage.css';

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        setLoading(true);
        setError('');
        const data = await getClients();
        if (!cancelled) setClients(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, 'Failed to load clients'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async (formData) => {
    try {
      setSubmitting(true);
      setError('');
      await createClient(formData);
      const data = await getClients();
      setClients(data);
      setShowForm(false);
      setEditingClient(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to create client'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (client) => {
    setEditingClient(client);
    setShowForm(false);
  };

  const handleUpdate = async (formData) => {
    if (!editingClient) return;
    const id = editingClient._id;
    try {
      setSubmitting(true);
      setUpdatingId(id);
      setError('');
      const response = await updateClient(id, formData);
      const updated = response.client || response;
      setClients((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setEditingClient(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update client'));
    } finally {
      setSubmitting(false);
      setUpdatingId(null);
    }
  };

  const handleDeleteClick = (client) => {
    setPendingDelete(client);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete._id;
    try {
      setDeletingId(id);
      setError('');
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c._id !== id));
      setPendingDelete(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete client'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  // Real counts derived from the loaded client list.
  const summary = useMemo(() => {
    const total = clients.length;
    const withEmail = clients.filter((c) => c.email && c.email.trim()).length;
    const withPhone = clients.filter((c) => c.phone && c.phone.trim()).length;
    return { total, withEmail, withPhone };
  }, [clients]);

  // Client-side search — name / email / phone (case-insensitive substring).
  // Mirrors the InvoicesPage toolbar pattern so the two list pages read
  // the same way. The filter is memoised so re-renders triggered by
  // unrelated state (editing, submitting) don't re-scan the list.
  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = (c?.name || '').toLowerCase();
      const email = (c?.email || '').toLowerCase();
      const phone = (c?.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [clients, query]);

  const hasClients = clients.length > 0;
  const isFiltering = hasClients && query.trim() !== '';
  const formOpen = showForm || Boolean(editingClient);

  return (
    <div className="clients-page">
      {/* Page header */}
      <section className="clients-page-header">
        <div className="clients-page-header-text">
          <p className="clients-page-eyebrow">Workspace</p>
          <h1 className="clients-page-title">Clients</h1>
          <p className="clients-page-subtitle">
            Manage the people and companies you invoice. Add a new client or update
            details for an existing one.
          </p>
        </div>
        <div className="clients-page-header-actions">
          {!showForm && !editingClient && (
            <button
              type="button"
              className="btn btn-primary clients-page-add-btn"
              onClick={() => setShowForm(true)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Client
            </button>
          )}
        </div>
      </section>

      {/* Modern search toolbar — mirrors InvoicesPage. Hidden while the
          form is open so it doesn't compete with the create / edit
          surface above. */}
      {!formOpen && hasClients && (
        <section className="clients-toolbar" aria-label="Client toolbar">
          <div className="clients-toolbar-search">
            <span className="clients-toolbar-search-icon" aria-hidden="true">
              {SEARCH_ICON}
            </span>
            <input
              type="search"
              className="clients-toolbar-search-input"
              placeholder="Search by name, email, or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search clients"
              disabled={loading && !hasClients}
            />
          </div>
        </section>
      )}

      {showForm && (
        <ClientForm
          key="create"
          initialValues={{ name: '', email: '', phone: '' }}
          onSubmit={handleCreate}
          onCancel={handleCancelForm}
          submitting={submitting}
        />
      )}

      {editingClient && (
        <ClientForm
          key={`edit-${editingClient._id}`}
          initialValues={{
            name: editingClient.name || '',
            email: editingClient.email || '',
            phone: editingClient.phone || '',
          }}
          onSubmit={handleUpdate}
          onCancel={handleCancelForm}
          submitting={submitting}
        />
      )}

      {/* Premium table card */}
      <section className="clients-table-card">
        <header className="clients-table-card-header">
          <div>
            <h2 className="clients-table-card-title">All Clients</h2>
            <p className="clients-table-card-subtitle">
              {loading
                ? 'Loading your client list…'
                : isFiltering
                  ? `Showing ${filteredClients.length} of ${summary.total} ${summary.total === 1 ? 'client' : 'clients'}`
                  : `${summary.total} ${summary.total === 1 ? 'client' : 'clients'} in your workspace`}
            </p>
          </div>
        </header>

        <ClientList
          clients={filteredClients}
          loading={loading}
          error={error}
          isFiltering={isFiltering}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          deletingId={deletingId}
          updatingId={updatingId}
        />
      </section>

      {/* Bottom summary cards */}
      <section className="clients-summary-grid">
        <div className="clients-summary-card">
          <span className="clients-summary-icon clients-summary-icon-primary" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <p className="clients-summary-label">Active Clients</p>
          <p className="clients-summary-value">
            {loading ? '—' : summary.total}
          </p>
          <p className="clients-summary-helper">
            {loading
              ? 'Loading…'
              : `${summary.withEmail} with email · ${summary.withPhone} with phone`}
          </p>
        </div>

        <div className="clients-summary-card">
          <span className="clients-summary-icon clients-summary-icon-accent" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V16.7c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
            </svg>
          </span>
          <p className="clients-summary-label">Quick Insights</p>
          <p className="clients-summary-helper clients-summary-helper-large">
            {loading
              ? 'Insights will appear once your clients are loaded.'
              : summary.total === 0
                ? 'Add your first client to see personalized insights here.'
                : `Keep contact details up to date so invoices reach the right person. ${summary.withEmail < summary.total ? `${summary.total - summary.withEmail} ${summary.total - summary.withEmail === 1 ? 'client is' : 'clients are'} missing an email.` : 'Every client has an email on file — nice work.'}`}
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete client"
        message={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={Boolean(deletingId)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}