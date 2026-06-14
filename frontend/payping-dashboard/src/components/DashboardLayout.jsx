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
      <nav className="top-navbar">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          ☰ {/* Hamburger icon for toggling sidebar */}
        </button>
        <div className="navbar-brand">PayPing Dashboard</div>
        <div className="navbar-user-info">
          <span>Welcome, {displayName}</span>
          <button type="button" onClick={onLogout} className="logout-button">
            Log out
          </button>
        </div>
      </nav>
      <aside className="sidebar">
        <nav>
          <ul>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
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
              >
                <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
                <span className="nav-label">Invoices</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
