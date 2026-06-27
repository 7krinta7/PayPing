/* =========================================================================
   Invoice presentation helpers (UI-only).

   These are pure display helpers. They do NOT call any backend, do NOT
   change state, and do NOT touch the database. They exist solely to make
   invoices easier to identify in the UI.
   ========================================================================= */

/* TODO(re-invoice-column): The Invoice reference column was removed from
 * the Invoices table because the backend Invoice model does NOT yet
 * expose a real sequential `invoiceNumber` field — references would
 * otherwise be fabricated by hashing the Mongo ObjectId, which is
 * misleading in a finance UI. The function below is retained ONLY as a
 * fallback for non-table surfaces (e.g. confirm dialog text) and must
 * NOT be used for primary display in the Invoices list. Reintroduce the
 * "Invoice" column in InvoiceList.jsx once the backend stores and
 * returns a real `invoiceNumber` for each invoice, then remove this
 * helper.
 */

/**
 * Generate a human-friendly invoice reference from a Mongo ObjectId or
 * arbitrary identifier.
 *
 * The mapping is deterministic — the same id always produces the same
 * reference — and intentionally short so it fits in table cells. We hash
 * the id into a 24-bit integer and zero-pad it. This is for display only;
 * the canonical id is preserved untouched in the data layer.
 *
 * Example: "6a3ab9ad9f3c2e1b4a7d8c90" -> "INV-000001"
 */
export function formatInvoiceRef(id) {
  if (!id || typeof id !== 'string') return 'INV-——';
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  // Mix one more time to avoid short-id collisions feeling too predictable.
  hash = ((hash >>> 16) ^ hash) >>> 0;
  const num = (hash % 999999) + 1;
  return `INV-${String(num).padStart(6, '0')}`;
}
