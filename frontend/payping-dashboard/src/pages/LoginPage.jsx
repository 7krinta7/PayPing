// Login page. On success, navigates to the page the user came from (if any),
// otherwise to /dashboard. Shows a generic error on failure — doesn't leak
// which field was wrong.

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../utils/errorMessage';
import loginIllustration from '../assets/login-illustration.png';
import './LoginPage.css';

/* ---- Inline SVG icons --------------------------------------------------- */
/* Inline rather than imported so the page is self-contained — matches the
   pattern used elsewhere (DashboardLayout, InvoicesPage, etc.). All sizes
   sized for the existing --space-* scale. */

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EYE_OPEN_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EYE_OFF_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.61 19.61 0 0 1 4.22-5.18" />
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.74 19.74 0 0 1-3.17 4.19" />
    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const WALLET_ICON = (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
  </svg>
);

const SHIELD_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const BOLT_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const BAR_CHART_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

/* ---- Component ---------------------------------------------------------- */

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

  // Local UI-only state for the password visibility toggle. No effect on
  // the auth payload — the actual login call uses the same `password`
  // string regardless of how it's currently masked.
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(formatApiError(err, 'Invalid credentials'));
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

        <p className="login-subtitle">
          Create invoices, send automated reminders, and get paid on time.
        </p>

        <div className="login-illustration" role="img" aria-label="Product illustration">
          <img
            src={loginIllustration}
            alt=""
            className="login-illustration-img"
            draggable="false"
          />
        </div>

        <div className="login-features" role="list">
          <div className="login-feature" role="listitem">
            <span className="login-feature-icon" aria-hidden="true">{SHIELD_ICON}</span>
            <div className="login-feature-text">
              <p className="login-feature-title">Secure</p>
              <p className="login-feature-desc">Your data is safe with us</p>
            </div>
          </div>
          <div className="login-feature" role="listitem">
            <span className="login-feature-icon" aria-hidden="true">{BOLT_ICON}</span>
            <div className="login-feature-text">
              <p className="login-feature-title">Automated</p>
              <p className="login-feature-desc">Save time with smart reminders</p>
            </div>
          </div>
          <div className="login-feature" role="listitem">
            <span className="login-feature-icon" aria-hidden="true">{BAR_CHART_ICON}</span>
            <div className="login-feature-text">
              <p className="login-feature-title">Insightful</p>
              <p className="login-feature-desc">Track payments and grow your business</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right: login card */}
      <section className="login-card-wrap">
        <div className="login-card">
          <header className="login-card-header">
            <span className="login-card-icon" aria-hidden="true">{WALLET_ICON}</span>
            <h2 className="login-card-title">Welcome Back!</h2>
            <p className="login-card-subtitle">
              Log in to manage your clients and invoices.
            </p>
          </header>

          <form onSubmit={onSubmit} className="login-form auth-form" noValidate>
            <label className="login-field">
              <span className="login-field-label">Email</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">{MAIL_ICON}</span>
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-field-label">Password</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">{LOCK_ICON}</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input login-input-with-toggle"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  tabIndex={0}
                >
                  {showPassword ? EYE_OFF_ICON : EYE_OPEN_ICON}
                </button>
              </div>
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
              <span className="login-submit-icon" aria-hidden="true">{LOCK_ICON}</span>
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