import { useState } from 'react';
import './ClientForm.css';

const INITIAL_STATE = { name: '', email: '', phone: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientForm({ initialValues, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(() => ({ ...INITIAL_STATE, ...(initialValues || {}) }));
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return 'Enter a valid email address';
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
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
  };

  const handleCancel = () => {
    setForm(INITIAL_STATE);
    setError('');
    onCancel();
  };

  return (
    <form className="client-form" onSubmit={handleSubmit} noValidate>
      <div className="client-form-field">
        <label htmlFor="client-name">Name</label>
        <input
          id="client-name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          disabled={submitting}
          autoFocus
        />
        {error && <span className="client-form-error">{error}</span>}
      </div>

      <div className="client-form-field">
        <label htmlFor="client-email">Email</label>
        <input
          id="client-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="client-form-field">
        <label htmlFor="client-phone">Phone</label>
        <input
          id="client-phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="client-form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Client'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
