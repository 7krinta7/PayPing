import { useState } from 'react';
import PhoneNumberField from '../forms/PhoneNumberField';
import { isValidPhoneNumber } from 'libphonenumber-js';
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

  // Phone uses an E.164 string managed by PhoneNumberField, not a
  // standard DOM event. Kept separate from `handleChange` so the
  // parent state shape (form.phone as a string) stays the same.
  const handlePhoneChange = (phone) => {
    setForm((prev) => ({ ...prev, phone: phone || '' }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return 'Enter a valid email address';
    }
    // Phone is optional. If the user typed something, it must be a
    // valid E.164 number — PhoneNumberField already shows a friendly
    // inline error while the user is typing, but the submit-time
    // guard catches the case where they tab past the field with an
    // invalid value and click Save anyway.
    if (form.phone && !isValidPhoneNumber(form.phone)) {
      return 'Please enter a valid phone number';
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
    // form.phone is already an E.164 string (or '' if blank), so
    // trimming is a no-op on a number that starts with '+'. Forward
    // it as-is so the backend stores exactly what the input shows.
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone ? form.phone.trim() : '',
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
        <PhoneNumberField
          id="client-phone"
          name="phone"
          value={form.phone}
          onChange={handlePhoneChange}
          disabled={submitting}
          placeholder="Phone number"
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
