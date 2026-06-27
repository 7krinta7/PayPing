import './BillingPage.css';

/**
 * BillingPage — UI-only billing & subscription surface.
 *
 * No backend integration. All controls are disabled except the action
 * affordances that point at features that aren't yet wired up. Every
 * disabled control is paired with a friendly helper line so the page
 * reads as a coherent product surface rather than a list of stubs.
 *
 * Sections:
 *   1. Current Plan       — plan name, price, cycle, status, renewal
 *   2. Usage              — email + WhatsApp (coming soon) progress bars
 *   3. Payment Method     — Visa ****1234 placeholder + disabled update
 *   4. Billing History    — responsive table of past invoices
 *   5. Available Plans    — Starter / Pro / Business with CTAs
 *
 * The current plan (Starter) is visually highlighted across both the
 * Current Plan card and the Available Plans grid so the user always
 * sees which tier they're on without comparing prices.
 */

const CURRENT_PLAN = {
  name: 'Starter',
  monthlyPrice: 499,
  cycle: 'Monthly',
  status: 'Active',
  renewsOn: 'Aug 12, 2026',
};

const USAGE = {
  email: { used: 184, quota: 500 },
  whatsapp: { used: 0, quota: 0, comingSoon: true },
};

// Realistic placeholder rows. Currency mirrors the rest of the app (INR).
const BILLING_HISTORY = [
  { id: 'INV-2026-007', date: 'Jul 12, 2026', amount: 499, status: 'paid' },
  { id: 'INV-2026-006', date: 'Jun 12, 2026', amount: 499, status: 'paid' },
  { id: 'INV-2026-005', date: 'May 12, 2026', amount: 499, status: 'paid' },
  { id: 'INV-2026-004', date: 'Apr 12, 2026', amount: 499, status: 'paid' },
  { id: 'INV-2026-003', date: 'Mar 12, 2026', amount: 499, status: 'failed' },
];

const AVAILABLE_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 499,
    period: 'month',
    description: 'For freelancers just getting started with invoice reminders.',
    features: [
      '500 email reminders / month',
      'Up to 25 clients',
      'Basic invoice tracking',
      'Email support',
    ],
    cta: 'Current Plan',
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1499,
    period: 'month',
    description: 'For growing businesses that need more capacity and control.',
    features: [
      '5,000 email reminders / month',
      'Up to 250 clients',
      'Custom reminder schedules',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
    current: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 3999,
    period: 'month',
    description: 'For larger teams that need scale, reporting, and SLAs.',
    features: [
      'Unlimited email reminders',
      'Unlimited clients',
      'Team workspaces',
      'Dedicated success manager',
    ],
    cta: 'Upgrade to Business',
    current: false,
  },
];

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return INR_FORMATTER.format(n);
}

function clampPercent(used, quota) {
  if (!quota) return 0;
  const pct = Math.round((used / quota) * 100);
  return Math.max(0, Math.min(100, pct));
}

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DOWNLOAD_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ARROW_UP_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const CREDIT_CARD_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const ZAP_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const WHATSAPP_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export default function BillingPage() {
  const emailPct = clampPercent(USAGE.email.used, USAGE.email.quota);

  return (
    <div className="billing-page">
      {/* ---- Page header ------------------------------------------------ */}
      <section className="billing-page-header">
        <div className="billing-page-header-text">
          <p className="billing-page-eyebrow">Workspace</p>
          <h1 className="billing-page-title">Billing &amp; Subscription</h1>
          <p className="billing-page-subtitle">
            Manage your PayPing plan, track usage, and review your billing history.
          </p>
        </div>
      </section>

      {/* ---- Top row: Current Plan + Usage ----------------------------- */}
      <section className="billing-top-grid">
        {/* Current Plan card */}
        <article className="billing-card billing-current-plan" aria-labelledby="billing-current-plan-title">
          <header className="billing-card-header">
            <div>
              <h2 id="billing-current-plan-title" className="billing-card-title">Current Plan</h2>
              <p className="billing-card-subtitle">Your active subscription.</p>
            </div>
            <span className="billing-status-badge billing-status-badge-active">
              <span className="billing-status-dot" aria-hidden="true" />
              {CURRENT_PLAN.status}
            </span>
          </header>

          <div className="billing-card-body billing-current-plan-body">
            <div className="billing-current-plan-name-row">
              <p className="billing-current-plan-name">{CURRENT_PLAN.name}</p>
              <span className="billing-current-plan-tag">Your plan</span>
            </div>

            <div className="billing-current-plan-price-row">
              <span className="billing-current-plan-price">{formatINR(CURRENT_PLAN.monthlyPrice)}</span>
              <span className="billing-current-plan-cycle">/ {CURRENT_PLAN.cycle.toLowerCase()}</span>
            </div>

            <dl className="billing-current-plan-meta">
              <div className="billing-current-plan-meta-item">
                <dt>Billing cycle</dt>
                <dd>{CURRENT_PLAN.cycle}</dd>
              </div>
              <div className="billing-current-plan-meta-item">
                <dt>Next renewal</dt>
                <dd>{CURRENT_PLAN.renewsOn}</dd>
              </div>
            </dl>
          </div>

          <footer className="billing-card-footer">
            <p className="billing-card-footer-helper">
              You&apos;re on the Starter plan. Upgrade any time.
            </p>
            <div className="billing-card-footer-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled
                aria-disabled="true"
                title="Plan upgrades aren't available yet"
              >
                {ARROW_UP_ICON}
                Upgrade Plan
              </button>
            </div>
          </footer>
        </article>

        {/* Usage card */}
        <article className="billing-card billing-usage" aria-labelledby="billing-usage-title">
          <header className="billing-card-header">
            <div>
              <h2 id="billing-usage-title" className="billing-card-title">Usage</h2>
              <p className="billing-card-subtitle">Your activity this billing cycle.</p>
            </div>
          </header>

          <div className="billing-card-body billing-usage-body">
            {/* Email reminders progress */}
            <div className="billing-usage-row">
              <div className="billing-usage-row-head">
                <span className="billing-usage-row-icon billing-usage-row-icon-primary" aria-hidden="true">
                  {ZAP_ICON}
                </span>
                <div className="billing-usage-row-text">
                  <p className="billing-usage-row-label">Email reminders</p>
                  <p className="billing-usage-row-helper">Resets on your next renewal date.</p>
                </div>
                <p className="billing-usage-row-count">
                  <span className="billing-usage-row-count-used">{USAGE.email.used.toLocaleString('en-IN')}</span>
                  <span className="billing-usage-row-count-sep"> / </span>
                  <span className="billing-usage-row-count-quota">{USAGE.email.quota.toLocaleString('en-IN')}</span>
                </p>
              </div>
              <div
                className="billing-usage-progress"
                role="progressbar"
                aria-valuenow={emailPct}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Email reminders used"
              >
                <span
                  className="billing-usage-progress-fill billing-usage-progress-fill-primary"
                  style={{ width: `${emailPct}%` }}
                />
              </div>
              <p className="billing-usage-row-foot">{emailPct}% of monthly quota used</p>
            </div>

            {/* WhatsApp — coming soon, no progress bar */}
            <div className="billing-usage-row">
              <div className="billing-usage-row-head">
                <span className="billing-usage-row-icon billing-usage-row-icon-muted" aria-hidden="true">
                  {WHATSAPP_ICON}
                </span>
                <div className="billing-usage-row-text">
                  <p className="billing-usage-row-label">WhatsApp reminders</p>
                  <p className="billing-usage-row-helper">Reach clients on WhatsApp with payment reminders.</p>
                </div>
                <span className="billing-coming-soon-badge" aria-label="Coming soon">
                  Coming Soon
                </span>
              </div>
              <div className="billing-usage-progress billing-usage-progress-disabled" aria-hidden="true">
                <span className="billing-usage-progress-fill" style={{ width: '0%' }} />
              </div>
              <p className="billing-usage-row-foot billing-usage-row-foot-muted">
                WhatsApp reminders will roll out in a future update.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* ---- Payment Method -------------------------------------------- */}
      <section className="billing-card billing-payment-method" aria-labelledby="billing-payment-title">
        <header className="billing-card-header">
          <div>
            <h2 id="billing-payment-title" className="billing-card-title">Payment Method</h2>
            <p className="billing-card-subtitle">The card on file for your subscription.</p>
          </div>
        </header>

        <div className="billing-card-body">
          <div className="billing-payment-row">
            <span className="billing-payment-icon" aria-hidden="true">
              {CREDIT_CARD_ICON}
            </span>
            <div className="billing-payment-text">
              <p className="billing-payment-brand">Visa</p>
              <p className="billing-payment-detail">Ending in •••• 1234 · Expires 12/27</p>
            </div>
            <div className="billing-payment-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled
                aria-disabled="true"
                title="Payment method updates aren't available yet"
              >
                Update Payment
              </button>
            </div>
          </div>
          <p className="billing-payment-helper">
            Payment method updates aren&apos;t available yet.
          </p>
        </div>
      </section>

      {/* ---- Billing History ------------------------------------------- */}
      <section className="billing-card billing-history-card" aria-labelledby="billing-history-title">
        <header className="billing-card-header billing-history-header">
          <div>
            <h2 id="billing-history-title" className="billing-card-title">Billing History</h2>
            <p className="billing-card-subtitle">Past invoices and payment receipts.</p>
          </div>
        </header>

        <div className="billing-card-body billing-history-body">
          {/* Desktop / tablet table */}
          <div className="billing-history-table-scroll">
            <table className="billing-history-table">
              <thead>
                <tr>
                  <th className="billing-history-col-id">Invoice #</th>
                  <th className="billing-history-col-date">Date</th>
                  <th className="billing-history-col-amount">Amount</th>
                  <th className="billing-history-col-status">Status</th>
                  <th className="billing-history-col-actions">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {BILLING_HISTORY.map((row) => (
                  <tr key={row.id} className="billing-history-row">
                    <td className="billing-history-col-id">
                      <span className="billing-history-id">{row.id}</span>
                    </td>
                    <td className="billing-history-col-date">
                      <span className="billing-history-date">{row.date}</span>
                    </td>
                    <td className="billing-history-col-amount">
                      <span className="billing-history-amount">{formatINR(row.amount)}</span>
                    </td>
                    <td className="billing-history-col-status">
                      <span className={`billing-history-status billing-history-status-${row.status}`}>
                        <span className="billing-history-status-dot" aria-hidden="true" />
                        {row.status}
                      </span>
                    </td>
                    <td className="billing-history-col-actions">
                      <button
                        type="button"
                        className="btn btn-secondary billing-history-download"
                        disabled
                        aria-disabled="true"
                        title="Invoice downloads aren't available yet"
                      >
                        {DOWNLOAD_ICON}
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list (≤ 640px) */}
          <ul className="billing-history-cards" role="list">
            {BILLING_HISTORY.map((row) => (
              <li key={row.id} className="billing-history-card-item">
                <div className="billing-history-card-head">
                  <span className="billing-history-id">{row.id}</span>
                  <span className={`billing-history-status billing-history-status-${row.status}`}>
                    <span className="billing-history-status-dot" aria-hidden="true" />
                    {row.status}
                  </span>
                </div>
                <div className="billing-history-card-meta">
                  <div className="billing-history-card-meta-item">
                    <span className="billing-history-card-meta-label">Date</span>
                    <span className="billing-history-card-meta-value">{row.date}</span>
                  </div>
                  <div className="billing-history-card-meta-item">
                    <span className="billing-history-card-meta-label">Amount</span>
                    <span className="billing-history-card-meta-value billing-history-amount">
                      {formatINR(row.amount)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary billing-history-download billing-history-download-full"
                  disabled
                  aria-disabled="true"
                >
                  {DOWNLOAD_ICON}
                  Download PDF
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Available Plans ------------------------------------------ */}
      <section className="billing-card billing-plans-card" aria-labelledby="billing-plans-title">
        <header className="billing-card-header">
          <div>
            <h2 id="billing-plans-title" className="billing-card-title">Available Plans</h2>
            <p className="billing-card-subtitle">Compare plans and choose the right tier for your workspace.</p>
          </div>
        </header>

        <div className="billing-card-body">
          <div className="billing-plans-grid">
            {AVAILABLE_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={[
                  'billing-plan',
                  plan.current && 'billing-plan-current',
                  plan.highlight && 'billing-plan-highlight',
                ].filter(Boolean).join(' ')}
                aria-current={plan.current ? 'true' : undefined}
              >
                {plan.current && (
                  <span className="billing-plan-badge" aria-label="Current plan">
                    Current Plan
                  </span>
                )}
                {plan.highlight && !plan.current && (
                  <span className="billing-plan-badge billing-plan-badge-highlight" aria-label="Most popular">
                    Most Popular
                  </span>
                )}

                <h3 className="billing-plan-name">{plan.name}</h3>
                <p className="billing-plan-description">{plan.description}</p>

                <div className="billing-plan-price-row">
                  <span className="billing-plan-price">{formatINR(plan.price)}</span>
                  <span className="billing-plan-period">/ {plan.period}</span>
                </div>

                <ul className="billing-plan-features" role="list">
                  {plan.features.map((feature) => (
                    <li key={feature} className="billing-plan-feature">
                      <span className="billing-plan-feature-icon" aria-hidden="true">{CHECK_ICON}</span>
                      <span className="billing-plan-feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="billing-plan-cta">
                  {plan.current ? (
                    <button type="button" className="btn btn-secondary billing-plan-button" disabled aria-disabled="true">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} billing-plan-button`}
                      disabled
                      aria-disabled="true"
                      title="Plan upgrades aren't available yet"
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <p className="billing-plans-helper">
            Plan upgrades will be available in a future update. Billing changes will be
            prorated against your current cycle.
          </p>
        </div>
      </section>
    </div>
  );
}