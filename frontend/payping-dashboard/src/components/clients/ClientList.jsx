export default function ClientList({
  clients,
  loading,
  error,
  onEdit,
  onDelete,
  deletingId,
  updatingId,
}) {
  if (loading) {
    return <div className="client-list-status">Loading clients...</div>;
  }

  if (error) {
    return <div className="client-list-status client-list-error">{error}</div>;
  }

  if (!clients || clients.length === 0) {
    return <div className="client-list-status client-list-empty">No clients yet. Add one to get started.</div>;
  }

  return (
    <div className="client-list">
      <table className="client-table">
        <thead>
          <tr>
  <th>Name</th>
  <th>Email</th>
  <th>Phone</th>
  <th className="client-table-actions-col">Actions</th>
</tr>
        </thead>
        <tbody>
  {clients.map((client) => {
    const isDeleting = deletingId === client._id;
    const isUpdating = updatingId === client._id;
    const rowBusy = isDeleting || isUpdating;

    return (
      <tr key={client._id} aria-busy={rowBusy}>
        <td>{client.name}</td>
        <td>{client.email || '—'}</td>
        <td>{client.phone || '—'}</td>
        <td className="client-table-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit?.(client)}
            disabled={rowBusy}
          >
            {isUpdating ? 'Updating...' : 'Edit'}
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => onDelete?.(client)}
            disabled={rowBusy}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
      </table>
    </div>
  );
}
