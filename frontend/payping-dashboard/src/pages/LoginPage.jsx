// Login page. On success, navigates to the page the user came from (if any),
// otherwise to /dashboard. Shows a generic error on failure — doesn't leak
// which field was wrong.

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
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

      {/* Right: login card */}
      <section className="login-card-wrap">
        <div className="login-card">
          <header>
            <h2 className="login-card-title">Welcome Back</h2>
            <p className="login-card-subtitle">
              Log in to manage your clients and invoices.
            </p>
          </header>

          <form onSubmit={onSubmit} className="login-form auth-form" noValidate>
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
                autoComplete="current-password"
              />
            </label>

            <div className="login-form-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="login-forgot">
                Forgot password?
              </Link>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={submitting}
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="login-footer">
            New to PayPing? <Link to="/register">Register now</Link>
          </p>
        </div>
      </section>
    </main>
  );
}