import { useEffect, useState } from 'react';
import {
  getPendingInvoices,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  deleteInvoice,
} from '../services/invoiceService';
import { getClients } from '../services/clientService';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceForm from '../components/invoices/InvoiceForm';
import ConfirmDialog from '../components/clients/ConfirmDialog';

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

  useEffect(() => {
    let cancelled = false;
    async function fetchInvoices() {
      try {
        setLoading(true);
        setError('');
        const data = await getPendingInvoices();
        if (!cancelled) setInvoices(data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load invoices');
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
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load clients');
      }
    }
    fetchClientList();
    return () => { cancelled = true; };
  }, []);

  const refreshInvoices = async () => {
    const data = await getPendingInvoices();
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
      setError(err.response?.data?.message || 'Failed to create invoice');
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
      setError(err.response?.data?.message || 'Failed to update invoice');
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
        err.response?.data?.message ||
          (type === 'pay' ? 'Failed to mark invoice as paid' : 'Failed to delete invoice')
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
  const isConfirmingDelete = pendingAction?.type === 'delete';
  const confirmBusy = Boolean(payingId) || Boolean(deletingId);

  return (
    <div className="invoices-page">
      <div className="invoices-page-header">
        <h1>Invoices</h1>
        {!showForm && !editingInvoice && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Add Invoice
          </button>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          key="create"
          initialValues={{ client: '', amount: '', dueDate: '', description: '' }}
          clients={clients}
          onSubmit={handleCreate}
          onCancel={handleCancelForm}
          submitting={submitting}
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
            amount: editingInvoice.amount ?? '',
            dueDate: editingInvoice.dueDate ? editingInvoice.dueDate.slice(0, 10) : '',
            description: editingInvoice.description || '',
          }}
          clients={clients}
          onSubmit={handleUpdate}
          onCancel={handleCancelForm}
          submitting={submitting}
        />
      )}

      <InvoiceList
        invoices={invoices}
        loading={loading}
        error={error}
        onEdit={handleEditClick}
        onMarkPaid={handlePayClick}
        onDelete={handleDeleteClick}
        payingId={payingId}
        deletingId={deletingId}
        updatingId={updatingId}
      />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={isConfirmingPay ? 'Mark invoice as paid' : 'Delete invoice'}
        message={
          pendingAction
            ? isConfirmingPay
              ? `Mark invoice ${pendingAction.invoice._id} as paid? This action cannot be undone.`
              : `Are you sure you want to delete invoice ${pendingAction.invoice._id}? This cannot be undone.`
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