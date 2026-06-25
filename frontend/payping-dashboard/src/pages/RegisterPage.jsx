// Register page. Client-side validates that passwords match and are long enough;
// the backend remains the source of truth for email uniqueness.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      // If register returned a token, AuthContext is already logged in.
      // Otherwise route to /login so the user can sign in.
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      {/* Left: promotional column */}
      <section className="login-promo" aria-hidden="false">
        <div className="login-logo">
          <span className="login-logo-mark" aria-hidden="true">P</span>
          <span>PayPing</span>
        </div>

        <h1 className="login-headline">
          Simple invoicing.{' '}
          <span className="login-headline-accent">
            Automated reminders.
          </span>{' '}
          Faster payments.
        </h1>

        <div className="login-illustration" role="img" aria-label="Product illustration placeholder" />

        <div className="login-features">
          <span className="login-feature-badge">
            <span className="login-feature-badge-dot" aria-hidden="true" />
            Secure Payments
          </span>
          <span className="login-feature-badge">
            <span className="login-feature-badge-dot" aria-hidden="true" />
            Smart Automation
          </span>
        </div>
      </section>

      {/* Right: register card */}
      <section className="login-card-wrap">
        <div className="login-card">
          <header>
            <h2 className="login-card-title">Create your account</h2>
            <p className="login-card-subtitle">
              Start sending invoices and getting paid faster.
            </p>
          </header>

          <form onSubmit={onSubmit} className="login-form auth-form" noValidate>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={submitting}
            >
              {submitting ? 'Creating account…' : 'Register'}
            </button>
          </form>

          <p className="login-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}