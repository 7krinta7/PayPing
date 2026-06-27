import './ClientList.css';
import { getInitials, avatarColors } from '../../utils/avatar';

const EDIT_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DELETE_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const EMPTY_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function ClientList({
  clients,
  loading,
  error,
  isFiltering = false,
  onEdit,
  onDelete,
  deletingId,
  updatingId,
}) {
  if (loading) {
    return (
      <div className="client-list-skeleton-wrap" aria-busy="true">
        <table className="client-table">
          <thead>
            <tr>
              <th>Client</th>
              <th className="client-table-phone-col">Phone</th>
              <th>Status</th>
              <th className="client-table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i} className="client-skeleton-row">
                <td>
                  <div className="client-skeleton-cell">
                    <span className="client-skeleton-avatar" />
                    <span className="client-skeleton-lines">
                      <span className="client-skeleton client-skeleton-name" />
                      <span className="client-skeleton client-skeleton-email" />
                    </span>
                  </div>
                </td>
                <td className="client-table-phone-col"><span className="client-skeleton client-skeleton-phone" /></td>
                <td><span className="client-skeleton client-skeleton-badge" /></td>
                <td className="client-table-actions-col"><span className="client-skeleton client-skeleton-action" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-list-error-wrap">
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    // Honest empty state — distinguishes "you've never added anyone"
    // from "your current search hides everyone". Same visual language
    // so the page reads consistently in both cases.
    if (isFiltering) {
      return (
        <div className="client-list-empty-state">
          <span className="client-list-empty-icon" aria-hidden="true">
            {EMPTY_ICON}
          </span>
          <p className="client-list-empty-title">No clients match your search</p>
          <p className="client-list-empty-body">
            Try a different name, email, or phone number.
          </p>
        </div>
      );
    }
    return (
      <div className="client-list-empty-state">
        <span className="client-list-empty-icon" aria-hidden="true">
          {EMPTY_ICON}
        </span>
        <p className="client-list-empty-title">No clients yet</p>
        <p className="client-list-empty-body">
          Add your first client to start creating invoices and tracking payments.
        </p>
      </div>
    );
  }

  return (
    <div className="client-list">
      <table className="client-table">
        <thead>
          <tr>
            <th className="client-table-name-col">Client</th>
            <th className="client-table-phone-col">Phone</th>
            <th>Status</th>
            <th className="client-table-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const isDeleting = deletingId === client._id;
            const isUpdating = updatingId === client._id;
            const rowBusy = isDeleting || isUpdating;
            const initials = getInitials(client.name);
            const colors = avatarColors(client.name);
            const secondary = client.email || 'No email on file';

            return (
              <tr key={client._id} aria-busy={rowBusy} className="client-table-row">
                <td className="client-table-name-cell">
                  <span
                    className="client-avatar"
                    style={{ backgroundColor: colors.bg, color: colors.fg }}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <span className="client-name-block">
                    <span className="client-name-text">{client.name}</span>
                    <span className="client-name-secondary">{secondary}</span>
                  </span>
                </td>
                <td className="client-table-phone-col client-table-phone-cell">
                  {client.phone || <span className="client-name-secondary">—</span>}
                </td>
                <td>
                  <span className="client-status-badge client-status-badge-active">
                    <span className="client-status-dot" aria-hidden="true" />
                    Active
                  </span>
                </td>
                <td className="client-table-actions-col">
                  <div className="client-table-actions">
                    <button
                      type="button"
                      className="client-icon-btn client-icon-btn-edit"
                      onClick={() => onEdit?.(client)}
                      disabled={rowBusy}
                      aria-label={isUpdating ? 'Updating...' : 'Edit client'}
                    >
                      {isUpdating ? (
                        <span className="client-icon-btn-spinner" aria-hidden="true" />
                      ) : (
                        EDIT_ICON
                      )}
                    </button>

                    <button
                      type="button"
                      className="client-icon-btn client-icon-btn-delete"
                      onClick={() => onDelete?.(client)}
                      disabled={rowBusy}
                      aria-label={isDeleting ? 'Deleting...' : 'Delete client'}
                    >
                      {isDeleting ? (
                        <span className="client-icon-btn-spinner" aria-hidden="true" />
                      ) : (
                        DELETE_ICON
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
