import { useState } from 'react';
import './InvoiceForm.css';

const INITIAL_STATE = { client: '', amount: '', dueDate: '', description: '' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function InvoiceForm({ initialValues, clients = [], onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(() => {
    const merged = { ...INITIAL_STATE, ...(initialValues || {}) };
    if (merged.client && typeof merged.client === 'object') {
      merged.client = merged.client._id || '';
    }
    return merged;
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.client) return 'Client is required';
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      return 'Amount must be greater than 0';
    }
    if (!form.dueDate) return 'Due date is required';
    if (!DATE_RE.test(form.dueDate)) {
      return 'Due date must be in YYYY-MM-DD format';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit({
      client: form.client,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      description: form.description.trim(),
    });
  };

  const handleCancel = () => {
    setForm(INITIAL_STATE);
    setError('');
    onCancel();
  };

  return (
    <form className="invoice-form" onSubmit={handleSubmit} noValidate>
      <div className="invoice-form-field">
        <label htmlFor="invoice-client">Client</label>
        <select
          id="invoice-client"
          name="client"
          value={form.client}
          onChange={handleChange}
          disabled={submitting}
          autoFocus
        >
          <option value="">Select a client</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        {error && <span className="invoice-form-error">{error}</span>}
      </div>

      <div className="invoice-form-field">
        <label htmlFor="invoice-amount">Amount</label>
        <input
          id="invoice-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="invoice-form-field">
        <label htmlFor="invoice-duedate">Due Date</label>
        <input
          id="invoice-duedate"
          name="dueDate"
          type="date"
          value={form.dueDate}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="invoice-form-field">
        <label htmlFor="invoice-description">Description</label>
        <textarea
          id="invoice-description"
          name="description"
          value={form.description}
          onChange={handleChange}
          disabled={submitting}
          rows={3}
        />
      </div>

      <div className="invoice-form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Invoice'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
