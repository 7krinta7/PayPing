/**
 * Frontend renderer for the user-customisable reminder email template.
 *
 * Mirrors `utils/emailTemplate.js` on the server so the Settings UI's
 * Preview panel shows exactly what the scheduler will send. The renderer
 * is pure — it is fed `values` directly rather than building them from a
 * real invoice — so Preview can use locally-generated sample data
 * without ever touching the database.
 *
 * Unknown variables are left unchanged in the output, matching the
 * server contract.
 */

export const EMAIL_TEMPLATE_VARS = [
  'businessName',
  'clientName',
  'invoiceNumber',
  'invoiceAmount',
  'dueDate',
  'invoiceDescription'
];

// Same shape as the server's PLACEHOLDER_RE. Letters / digits / underscore;
// no whitespace inside the braces on purpose — the Settings UI does not
// allow leading/trailing whitespace in the variable names either.
const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * Sample values fed into the Preview panel. Generated entirely on the
 * client — never sent to the server — so the user can experiment with
 * the template without affecting production data or leaving any preview
 * state on disk.
 */
export const SAMPLE_VALUES = {
  businessName: 'Acme Studios',
  clientName: 'Priya Sharma',
  invoiceNumber: 'INV-2026-0042',
  invoiceAmount: '12,500',
  dueDate: 'Tue Jul 01 2026',
  invoiceDescription: 'Website redesign — June 2026'
};

export function renderTemplate(template, values) {
  if (typeof template !== 'string') return '';
  return template.replace(PLACEHOLDER_RE, (match, name) => {
    if (values && Object.prototype.hasOwnProperty.call(values, name)) {
      return values[name];
    }
    return match;
  });
}