import { useEffect, useState } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../services/clientService';
import ClientList from '../components/clients/ClientList';
import ClientForm from '../components/clients/ClientForm';
import ConfirmDialog from '../components/clients/ConfirmDialog';

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

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        setLoading(true);
        setError('');
        const data = await getClients();
        if (!cancelled) setClients(data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load clients');
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
      setError(err.response?.data?.message || 'Failed to create client');
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
      setError(err.response?.data?.message || 'Failed to update client');
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
      setError(err.response?.data?.message || 'Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  return (
    <div className="clients-page">
      <div className="clients-page-header">
        <h1>Clients</h1>
        {!showForm && !editingClient && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Add Client
          </button>
        )}
      </div>

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

      <ClientList
        clients={clients}
        loading={loading}
        error={error}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        deletingId={deletingId}
        updatingId={updatingId}
      />

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
