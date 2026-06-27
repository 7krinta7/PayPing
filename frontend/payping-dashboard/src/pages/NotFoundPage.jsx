import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const HOME_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
);

/**
 * NotFoundPage — full-page 404 screen shown for any unmatched route.
 *
 * Sits outside the DashboardLayout (no nav, no sidebar) so the styling
 * here is self-contained. Reuses existing design tokens — no new
 * colors, type, or shadows.
 */
export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <p className="not-found-eyebrow">404</p>
        <h1 id="not-found-title" className="not-found-code">404</h1>
        <p className="not-found-title">We couldn&apos;t find that page</p>
        <p className="not-found-body">
          The link may be broken, or the page may have been moved. Head back to
          your dashboard to pick up where you left off.
        </p>
        <div className="not-found-actions">
          <Link to="/dashboard" className="btn btn-primary">
            {HOME_ICON}
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}