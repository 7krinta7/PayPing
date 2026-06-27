// Register page. Client-side validates that passwords match and are long enough;
// the backend remains the source of truth for email uniqueness.
//
// Visual layout, marketing section, card styling, input styling, icon
// treatment, button styling, footer link styling and all responsive
// behaviour are intentionally shared with the Login page (imports the
// same LoginPage.css and reuses every `.login-*` class). Only the form
// field set differs (Name + Email + Password + Confirm password).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../utils/errorMessage';
import loginIllustration from '../assets/login-illustration.png';
import './LoginPage.css';

/* ---- Inline SVG icons --------------------------------------------------- */
/* Same inline-SVG pattern as LoginPage.jsx so the page stays
   self-contained. Sizes match the Login page's prefix icons. */

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

const USER_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const WALLET_ICON = (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
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

/* ---- Component ---------------------------------------------------------- */

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Local UI-only state for password visibility. Each password
  // field has its OWN independent toggle so users can compare the
  // two values without losing the masking of the other — matches
  // the standard "confirm password" UX pattern. No effect on the
  // auth payload; the actual register call uses the same `password`
  // / `confirm` strings regardless of how they're currently masked.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setError(formatApiError(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      {/* Left: promotional column — identical to LoginPage.jsx so the
         two pages read as a matched pair. Same logo, headline,
         subtitle, illustration and feature row. */}
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
            <span className="login-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </span>
            <div className="login-feature-text">
              <p className="login-feature-title">Secure</p>
              <p className="login-feature-desc">Your data is safe with us</p>
            </div>
          </div>
          <div className="login-feature" role="listitem">
            <span className="login-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <div className="login-feature-text">
              <p className="login-feature-title">Automated</p>
              <p className="login-feature-desc">Save time with smart reminders</p>
            </div>
          </div>
          <div className="login-feature" role="listitem">
            <span className="login-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <div className="login-feature-text">
              <p className="login-feature-title">Insightful</p>
              <p className="login-feature-desc">Track payments and grow your business</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right: register card — visually identical to the Login card.
         Only the heading copy, subtitle copy, field set, button copy
         and footer copy differ. All styling comes from the shared
         `.login-card` / `.login-form` / `.login-field` /
         `.login-input-wrap` / `.login-input-icon` / `.login-input` /
         `.login-input-toggle` / `.login-submit` / `.login-footer`
         rules in LoginPage.css. */}
      <section className="login-card-wrap">
        <div className="login-card">
          <header className="login-card-header">
            <span className="login-card-icon" aria-hidden="true">{WALLET_ICON}</span>
            <h2 className="login-card-title">Create your account</h2>
            <p className="login-card-subtitle">
              Start sending invoices and getting paid faster.
            </p>
          </header>

          <form onSubmit={onSubmit} className="login-form auth-form register-form" noValidate>
            <label className="login-field">
              <span className="login-field-label">Name</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">{USER_ICON}</span>
                <input
                  type="text"
                  className="login-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Enter your name"
                />
              </div>
            </label>

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
                  minLength={8}
                  autoComplete="new-password"
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

            <label className="login-field">
              <span className="login-field-label">Confirm password</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">{LOCK_ICON}</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="login-input login-input-with-toggle"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  tabIndex={0}
                >
                  {showConfirmPassword ? EYE_OFF_ICON : EYE_OPEN_ICON}
                </button>
              </div>
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={submitting}
            >
              <span className="login-submit-icon" aria-hidden="true">{LOCK_ICON}</span>
              {submitting ? 'Creating account…' : 'Create account'}
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