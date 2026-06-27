import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMe,
  updateProfile,
  updateNotificationPreferences
} from '../services/userService';
import ChangePasswordDialog from '../components/settings/ChangePasswordDialog';
import EmailTemplateCard from '../components/settings/EmailTemplateCard';
import { formatApiError } from '../utils/errorMessage';
import './SettingsPage.css';

/**
 * SettingsPage — account, workspace, and notification preferences.
 *
 * Built to read as production-ready while remaining honest about the
 * features that aren't available yet. Every section is a real card
 * with the same surface treatment as the rest of the dashboard.
 * Where a feature is not yet supported, the control renders as a
 * disabled input or button with a friendly inline message — no
 * backend implementation details are exposed to the user.
 *
 * "Coming Soon" badges are reserved for genuine future product
 * features (WhatsApp reminders, Reminder Scheduling, Billing).
 * Anything that is simply a backend gap is surfaced via a single,
 * user-friendly line of helper text.
 *
 * Real actions:
 *   - Load + save Profile (email + businessName) via /api/user/me + PATCH /api/user/profile.
 *   - Logout (useAuth().logout()) — wired and functional.
 */

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ---- Profile state -------------------------------------------------
  const [profile, setProfile] = useState({ email: '', businessName: '' });
  const [businessNameDraft, setBusinessNameDraft] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // ---- Notification preferences state ------------------------------
  // Email preference is the only editable channel in this phase.
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [notifMessage, setNotifMessage] = useState('');

  // ---- Change Password modal state ----------------------------------
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileError('');
        const data = await getMe();
        if (cancelled) return;
        setProfile({
          email: data?.email || '',
          businessName: data?.businessName || ''
        });
        setBusinessNameDraft(data?.businessName || '');
        setEmailRemindersEnabled(Boolean(data?.notificationPreferences?.email));
      } catch (err) {
        if (cancelled) return;
        setProfileError(formatApiError(err, 'Failed to load profile'));
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setNotifLoading(false);
        }
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  // Save is only allowed when the draft differs from the loaded value.
  const isDirty = businessNameDraft !== (profile.businessName || '');
  const canSave = !profileLoading && !saving && isDirty;

  const handleSaveProfile = async (e) => {
    e?.preventDefault?.();
    if (!canSave) return;
    try {
      setSaving(true);
      setProfileError('');
      setSaveMessage('');
      const data = await updateProfile({ businessName: businessNameDraft });
      const nextName = data?.businessName ?? businessNameDraft.trim();
      setProfile((prev) => ({ ...prev, businessName: nextName }));
      setBusinessNameDraft(nextName);
      setSaveMessage('Profile updated.');
    } catch (err) {
      setProfileError(formatApiError(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle handler — persists the new value immediately. Optimistic UI is
  // kept conservative: we flip the checkbox locally for snappy feedback
  // and revert on failure.
  const handleEmailToggle = async (e) => {
    const next = e.target.checked;
    const previous = emailRemindersEnabled;
    if (notifSaving) return;
    try {
      setNotifSaving(true);
      setNotifError('');
      setNotifMessage('');
      setEmailRemindersEnabled(next);
      const data = await updateNotificationPreferences({ email: next });
      setEmailRemindersEnabled(Boolean(data?.notificationPreferences?.email));
      setNotifMessage(next ? 'Email reminders enabled.' : 'Email reminders disabled.');
    } catch (err) {
      setEmailRemindersEnabled(previous);
      setNotifError(formatApiError(err, 'Failed to update notification preference'));
    } finally {
      setNotifSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="settings-page">
      {/* ---- Header --------------------------------------------------- */}
      <section className="settings-page-header">
        <div className="settings-page-header-text">
          <p className="settings-page-eyebrow">Workspace</p>
          <h1 className="settings-page-title">Settings</h1>
          <p className="settings-page-subtitle">
            Manage your account, workspace preferences, and notification settings.
          </p>
        </div>
      </section>

      {/* ---- Profile card -------------------------------------------- */}
      <section className="settings-card" aria-labelledby="settings-profile-title">
        <header className="settings-card-header">
          <h2 id="settings-profile-title" className="settings-card-title">Profile</h2>
          <p className="settings-card-subtitle">Manage your account information.</p>
        </header>

        <form className="settings-card-body" onSubmit={handleSaveProfile}>
          {profileError && (
            <div className="alert alert-error" role="alert">
              {profileError}
            </div>
          )}

          <div className="settings-row-stacked">
            <label htmlFor="settings-email" className="settings-row-label-text">
              Email Address
            </label>
            {profileLoading ? (
              <span
                className="settings-skeleton settings-skeleton-input"
                role="status"
                aria-label="Loading email"
              />
            ) : (
              <input
                id="settings-email"
                type="email"
                className="settings-text-input"
                value={profile.email || ''}
                disabled
                readOnly
                aria-describedby="settings-email-helper"
              />
            )}
            <p id="settings-email-helper" className="settings-row-helper settings-row-helper-muted">
              Email cannot be changed here.
            </p>
          </div>

          <div className="settings-row-stacked">
            <label htmlFor="settings-business-name" className="settings-row-label-text">
              Business Name
            </label>
            {profileLoading ? (
              <span
                className="settings-skeleton settings-skeleton-input"
                role="status"
                aria-label="Loading business name"
              />
            ) : (
              <input
                id="settings-business-name"
                type="text"
                className="settings-text-input"
                placeholder="Not configured"
                value={businessNameDraft}
                onChange={(e) => {
                  setBusinessNameDraft(e.target.value);
                  setSaveMessage('');
                }}
                disabled={saving}
                maxLength={120}
                aria-describedby="settings-business-name-helper"
              />
            )}
            <p id="settings-business-name-helper" className="settings-row-helper settings-row-helper-muted">
              Shown on invoices and reminders. Leave blank to remove.
            </p>
          </div>

          {/* Password — opens the Change Password modal. The modal handles
              its own validation, loading, success, and error states, and
              clears all password fields when it closes. */}
          <div className="settings-row-stacked">
            <span className="settings-row-label-text">Password</span>
            <p className="settings-row-helper settings-row-helper-muted">
              Update the password you use to sign in.
            </p>
            <div className="settings-row-control">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setChangePasswordOpen(true)}
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Submit button lives inside the form so the browser's native
              submit (including Enter-to-submit from the Business Name input)
              invokes handleSaveProfile. */}
          <div className="settings-card-footer-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSave}
              aria-disabled={!canSave}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>

        <footer className="settings-card-footer">
          <p className="settings-card-footer-helper" aria-live="polite">
            {saveMessage ||
              (profileLoading
                ? 'Loading profile…'
                : saving
                  ? 'Saving…'
                  : isDirty
                    ? 'You have unsaved changes.'
                    : 'Profile is up to date.')}
          </p>
        </footer>
      </section>

      {/* ---- Email Template card ------------------------------------- */}
      <EmailTemplateCard />

      {/* ---- Notification Preferences card -------------------------- */}
      <section className="settings-card" aria-labelledby="settings-notifications-title">
        <header className="settings-card-header">
          <h2 id="settings-notifications-title" className="settings-card-title">
            Notification Preferences
          </h2>
          <p className="settings-card-subtitle">
            Choose how PayPing contacts you about your invoices.
          </p>
        </header>

        <div className="settings-card-body">
          {/* Email reminders — the only user-editable channel in this phase.
              WhatsApp stays disabled below with a "Coming Soon" badge. */}
          <div className="settings-row">
            <div className="settings-row-label">
              <p className="settings-row-label-text">Email reminders</p>
              <p className="settings-row-label-sub">
                Receive payment reminders by email.
              </p>
            </div>
            <div className="settings-row-control">
              <input
                type="checkbox"
                className="settings-toggle"
                checked={notifLoading ? false : emailRemindersEnabled}
                onChange={handleEmailToggle}
                disabled={notifLoading || notifSaving}
                aria-busy={notifSaving}
                aria-label="Email reminders"
                aria-describedby="settings-email-toggle-helper"
              />
            </div>
            <p id="settings-email-toggle-helper" className="settings-row-helper settings-row-helper-muted">
              {notifLoading
                ? 'Loading…'
                : notifSaving
                  ? 'Saving…'
                  : emailRemindersEnabled
                    ? 'Email reminders are on.'
                    : 'Email reminders are off.'}
            </p>
            {notifError && (
              <div className="alert alert-error settings-notifications-alert" role="alert">
                {notifError}
              </div>
            )}
            {notifMessage && !notifError && (
              <div className="alert alert-success settings-notifications-alert" role="status">
                {notifMessage}
              </div>
            )}
          </div>

          {/* WhatsApp reminders — genuine future product. Disabled
              toggle + "Coming Soon" badge. */}
          <div className="settings-row">
            <div className="settings-row-label">
              <p className="settings-row-label-text">WhatsApp reminders</p>
              <p className="settings-row-label-sub">
                Receive payment reminders on WhatsApp.
              </p>
            </div>
            <div className="settings-row-control">
              <span className="settings-coming-soon-badge" aria-label="Coming soon">
                Coming Soon
              </span>
              <input
                type="checkbox"
                className="settings-toggle"
                disabled
                aria-label="WhatsApp reminders (coming soon)"
                aria-describedby="settings-whatsapp-toggle-helper"
              />
            </div>
            <p id="settings-whatsapp-toggle-helper" className="settings-row-helper settings-row-helper-muted">
              Not available yet.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Workspace card ----------------------------------------- */}
      <section className="settings-card" aria-labelledby="settings-workspace-title">
        <header className="settings-card-header">
          <h2 id="settings-workspace-title" className="settings-card-title">Workspace</h2>
          <p className="settings-card-subtitle">
            Workspace identity and membership.
          </p>
        </header>

        <div className="settings-card-body">
          <div className="settings-row-stacked">
            <label htmlFor="settings-workspace-name" className="settings-row-label-text">
              Workspace Name
            </label>
            <input
              id="settings-workspace-name"
              type="text"
              className="settings-text-input"
              placeholder="Not configured"
              disabled
              aria-describedby="settings-workspace-name-helper"
            />
            <p id="settings-workspace-name-helper" className="settings-row-helper settings-row-helper-muted">
              Workspace customization will be available in a future update.
            </p>
          </div>

          {/* Real Logout — wired to the existing auth context. */}
          <div className="settings-row">
            <div className="settings-row-label">
              <p className="settings-row-label-text">Log out</p>
              <p className="settings-row-label-sub">
                Sign out of your PayPing account.
              </p>
            </div>
            <div className="settings-row-control">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>

          {/* Danger Zone — destructive actions, kept visually
              separated from the rest of the workspace card.
              Delete Account is disabled (no backend support)
              with a helper line explaining why. */}
          <div className="settings-danger-zone">
            <div className="settings-danger-zone-header">
              <h3 className="settings-danger-zone-title">Danger Zone</h3>
            </div>
            <div className="settings-row">
              <div className="settings-row-label">
                <p className="settings-row-label-text">Delete Account</p>
                <p className="settings-row-label-sub">
                  Permanently delete your PayPing account and all associated data.
                </p>
              </div>
              <div className="settings-row-control">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled
                  aria-disabled="true"
                  title="Account deletion is not yet available"
                >
                  Delete Account
                </button>
              </div>
            </div>
            <p className="settings-danger-zone-helper">
              Account deletion isn&apos;t available yet.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Future Features card ----------------------------------- */}
      <section className="settings-card" aria-labelledby="settings-future-title">
        <header className="settings-card-header">
          <h2 id="settings-future-title" className="settings-card-title">Future Features</h2>
          <p className="settings-card-subtitle">
            Features on the roadmap for PayPing.
          </p>
        </header>

        <div className="settings-card-body">
          <ul className="settings-feature-list" role="list">
            <li className="settings-feature-row">
              <div className="settings-feature-text">
                <p className="settings-feature-name">Reminder Scheduling</p>
                <p className="settings-feature-description">
                  Build custom reminder schedules tied to invoice due dates and overdue states.
                </p>
              </div>
              <span className="settings-coming-soon-badge" aria-label="Coming soon">
                Coming Soon
              </span>
            </li>
            <li className="settings-feature-row">
              <div className="settings-feature-text">
                <p className="settings-feature-name">WhatsApp Reminders</p>
                <p className="settings-feature-description">
                  Reach clients on WhatsApp with payment reminders and receipts.
                </p>
              </div>
              <span className="settings-coming-soon-badge" aria-label="Coming soon">
                Coming Soon
              </span>
            </li>
            <li className="settings-feature-row">
              <div className="settings-feature-text">
                <p className="settings-feature-name">Billing &amp; Subscriptions</p>
                <p className="settings-feature-description">
                  Manage your PayPing plan, invoices, and add-ons from a single billing console.
                </p>
              </div>
              <span className="settings-coming-soon-badge" aria-label="Coming soon">
                Coming Soon
              </span>
            </li>
          </ul>
        </div>
      </section>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
