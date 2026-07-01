/**
 * emailTemplate — Phase 7
 *
 * Renders a stored reminder email template against an invoice context.
 * The renderer is intentionally tiny and pure so it is trivial to call
 * from both the live reminder scheduler and the Settings preview path
 * (which feeds in sample data).
 *
 * Contract:
 *   - `{{varName}}` placeholders are replaced when `varName` is a key in
 *     the provided `values` object.
 *   - Unknown / missing placeholders are left in the output unchanged,
 *     so a typo or a future variable in a custom template never gets
 *     silently swallowed (e.g. an admin sees `{{clientNme}}` in the
 *     delivered email rather than nothing).
 *   - The placeholder matcher accepts letters, digits, and underscore —
 *     exactly the same shape used by the Settings UI's variable list.
 *
 * `formatDueDate` is the single source of truth for due-date formatting
 * so a future change (locale, timezone, custom format) lands in one
 * place instead of being duplicated across the renderer and the
 * scheduler.
 */
const { EMAIL_TEMPLATE_VARS } = require("../models/User");

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

function formatDueDate(invoice) {
  if (!invoice || !invoice.dueDate) return "";
  return new Date(invoice.dueDate).toDateString();
}

/**
 * Build the variable map the renderer consumes. Pulls from the user
 * (business identity) and the populated invoice (client, amount,
 * due date, description). Missing fields fall back to empty strings
 * rather than `undefined` so the template never renders the literal
 * string "undefined".
 */
function buildValues({ user, invoice }) {
  const clientName = invoice?.client?.name || "";
  const description = (invoice?.description || "").trim();
  // The user-assigned invoice number is the natural reference in
  // reminder emails. Legacy invoices may not have one, so we render
  // an empty string rather than "undefined" or the raw ObjectId — the
  // default template only references {{invoiceNumber}} in prose, and
  // a missing number should read as "no reference" rather than
  // expose internal identifiers.
  const invoiceNumber = (invoice?.invoiceNumber || "").trim();

  return {
    businessName: user?.businessName || "",
    clientName,
    invoiceNumber,
    invoiceAmount: invoice?.amount != null ? String(invoice.amount) : "",
    dueDate: formatDueDate(invoice),
    invoiceDescription: description
  };
}

/**
 * Render a template string. `values` is a plain `{varName: replacement}`
 * map. Unknown variables are left untouched in the output.
 *
 * Exposed for unit tests / verification harnesses.
 */
function render(template, values) {
  if (typeof template !== "string") return "";
  return template.replace(PLACEHOLDER_RE, (match, name) => {
    if (values && Object.prototype.hasOwnProperty.call(values, name)) {
      return values[name];
    }
    return match;
  });
}

/**
 * Render a stored user template. Falls back to the DEFAULT_EMAIL_*
 * constants when the user has not customised one of the fields so the
 * scheduler always has a subject + body to send.
 */
function renderForUser(user, invoice) {
  const values = buildValues({ user, invoice });

  const DEFAULT_EMAIL_SUBJECT = require("../models/User").DEFAULT_EMAIL_SUBJECT;
  const DEFAULT_EMAIL_BODY = require("../models/User").DEFAULT_EMAIL_BODY;

  const storedSubject = user?.emailTemplate?.subject?.trim();
  const storedBody = user?.emailTemplate?.body;

  const subject = storedSubject || DEFAULT_EMAIL_SUBJECT;
  const body = (typeof storedBody === "string" && storedBody.length > 0)
    ? storedBody
    : DEFAULT_EMAIL_BODY;

  return {
    subject: render(subject, values),
    body: render(body, values)
  };
}

module.exports = {
  EMAIL_TEMPLATE_VARS,
  PLACEHOLDER_RE,
  formatDueDate,
  buildValues,
  render,
  renderForUser
};
