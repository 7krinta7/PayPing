import { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css'; // Use dedicated CSS file

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for collapsible sidebar

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev); // Functional state update
  };

  const displayName = user?.name || user?.email || 'there';

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Skip link: invisible until focused, lets keyboard users jump past
          the navbar + sidebar straight to the main content. Reuses
          existing tokens; no new design language. */}
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <nav className="top-navbar" role="banner" aria-label="Primary">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={isSidebarOpen}
          aria-controls="primary-sidebar"
        >
          ☰ {/* Hamburger icon for toggling sidebar */}
        </button>
        <div className="navbar-brand">PayPing Dashboard</div>
        <div className="navbar-user-info">
          <span>Welcome, {displayName}</span>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-danger btn-sm logout-button"
            title={`Sign out ${displayName}`}
          >
            Log out
          </button>
        </div>
      </nav>
      <aside className="sidebar" id="primary-sidebar">
        <nav aria-label="Sections">
          <ul>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
                <span className="nav-label">Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/clients"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <span className="nav-label">Clients</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/invoices"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
                <span className="nav-label">Invoices</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/reminders"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="nav-label">Reminders</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span className="nav-label">Settings</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/billing"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span className="nav-label">Billing</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      <main id="main-content" className="content-area" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;