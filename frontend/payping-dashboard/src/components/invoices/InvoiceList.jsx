import "./InvoiceList.css";
export default function InvoiceList({
  invoices,
  loading,
  error,
  onEdit,
  onMarkPaid,
  onDelete,
  payingId,
  deletingId,
  updatingId,
}) {
  if (loading) {
    return <div className="invoice-list-status">Loading invoices...</div>;
  }

  if (error) {
    return <div className="alert alert-error invoice-list-error invoice-list-status">{error}</div>;
  }

  if (!invoices || invoices.length === 0) {
    return <div className="invoice-list-status invoice-list-empty">No pending invoices. Add one to get started.</div>;
  }

  return (
    <div className="invoice-list">
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th className="invoice-table-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const isPaying = payingId === invoice._id;
            const isDeleting = deletingId === invoice._id;
            const isUpdating = updatingId === invoice._id;
            const rowBusy = isPaying || isDeleting || isUpdating;
            const isPaid = invoice.status === 'paid';

            return (
              <tr key={invoice._id} aria-busy={rowBusy}>
                <td>{invoice.client?.name || '—'}</td>
                <td>{invoice.amount ?? '—'}</td>
                <td>
  {invoice.dueDate
    ? invoice.dueDate.slice(0, 10)
    : '—'}
</td>
                <td>
                  <span className={`invoice-status invoice-status-${invoice.status || 'pending'}`}>
                    {invoice.status || 'pending'}
                  </span>
                </td>
                <td className="invoice-table-actions">
                  {!isPaid && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEdit?.(invoice)}
                      disabled={rowBusy}
                    >
                      {isUpdating ? 'Updating...' : 'Edit'}
                    </button>
                  )}

                  {!isPaid && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onMarkPaid?.(invoice)}
                      disabled={rowBusy}
                    >
                      {isPaying ? 'Marking...' : 'Mark Paid'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete?.(invoice)}
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
