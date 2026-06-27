const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

const validate = require("../middleware/validate");
const { updateRules } = require("../middleware/validators/emailTemplateValidators");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/sendEmail");
const { renderForUser } = require("../utils/emailTemplate");

const { DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY, EMAIL_TEMPLATE_VARS } = require("../models/User");

/**
 * Local SAMPLE values — mirror of the frontend's preview sample set so
 * the test email the user receives looks identical to what the Settings
 * UI's preview panel shows. Generated entirely on the server so the
 * endpoint is self-contained (no Invoice lookup, no ReminderHistory
 * write, no business-record fabrication).
 */
const TEST_EMAIL_SAMPLE = {
  businessName: "Acme Studios",
  clientName: "Priya Sharma",
  invoiceAmount: "12,500",
  dueDate: new Date().toDateString(),
  invoiceDescription: "Website redesign — sample invoice"
};

/**
 * GET /api/email-template
 *
 * Returns the authenticated user's stored reminder email template.
 * Empty stored fields are normalised to the defaults so the UI always
 * shows a complete template (and the "Reset to Default" action maps
 * cleanly to writing the defaults back).
 */
router.get("/", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const stored = user.emailTemplate || {};
    const subject = (stored.subject || "").trim() || DEFAULT_EMAIL_SUBJECT;
    const body = (typeof stored.body === "string" && stored.body.length > 0)
      ? stored.body
      : DEFAULT_EMAIL_BODY;

    res.json({
      subject,
      body,
      isCustomised: Boolean(
        (stored.subject && stored.subject.trim().length > 0) ||
        (typeof stored.body === "string" && stored.body.length > 0)
      ),
      variables: EMAIL_TEMPLATE_VARS,
      defaults: {
        subject: DEFAULT_EMAIL_SUBJECT,
        body: DEFAULT_EMAIL_BODY
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/email-template
 *
 * Updates the user's stored reminder email template. Both subject and
 * body are optional; an empty string clears the customisation so the
 * scheduler falls back to the default. The list of supported variables
 * is returned with the response so the UI can refresh its variable
 * sidebar without an extra round-trip.
 */
router.patch("/", auth, updateRules, validate, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.emailTemplate) user.emailTemplate = {};

    if (req.body.subject !== undefined) {
      user.emailTemplate.subject = String(req.body.subject);
    }
    if (req.body.body !== undefined) {
      user.emailTemplate.body = String(req.body.body);
    }

    await user.save();

    const stored = user.emailTemplate;
    res.json({
      message: "Email template updated",
      subject: (stored.subject || "").trim() || DEFAULT_EMAIL_SUBJECT,
      body: (typeof stored.body === "string" && stored.body.length > 0)
        ? stored.body
        : DEFAULT_EMAIL_BODY,
      isCustomised: Boolean(
        (stored.subject && stored.subject.trim().length > 0) ||
        (typeof stored.body === "string" && stored.body.length > 0)
      ),
      variables: EMAIL_TEMPLATE_VARS,
      defaults: {
        subject: DEFAULT_EMAIL_SUBJECT,
        body: DEFAULT_EMAIL_BODY
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/email-template/test
 *
 * Phase 8 — Send a preview email to the authenticated user so they can
 * see exactly what PayPing will deliver on their behalf before saving.
 *
 * Contract:
 *   - The body may include optional `subject` and `body` strings. When
 *     present, these are used INSTEAD of the stored template (so the
 *     Settings UI can send an unsaved draft).
 *   - When absent, the user's stored template (or its default) is used.
 *   - The recipient is always `user.email` — the logged-in user. The
 *     endpoint refuses to send to any other address.
 *   - This is a standalone preview. It does NOT write to ReminderHistory
 *     and does NOT create an Invoice / ReminderRule record.
 *   - The renderer is the same `renderForUser` used by the scheduler,
 *     so the delivered content is byte-identical to what would be sent
 *     by a real reminder (only the variable values differ — locally
 *     generated samples, never real business data).
 */
router.post("/test", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // Override path: the Settings UI sends the current draft (possibly
    // unsaved) so the test email reflects what the user is editing.
    // Empty / whitespace-only fields fall through to the stored value
    // — mirroring the PATCH endpoint's "empty clears customisation"
    // semantics would discard the user's in-flight draft.
    if (req.body && typeof req.body.subject === "string" && req.body.subject.trim().length > 0) {
      user.emailTemplate = user.emailTemplate || {};
      user.emailTemplate.subject = req.body.subject;
    }
    if (req.body && typeof req.body.body === "string" && req.body.body.length > 0) {
      user.emailTemplate = user.emailTemplate || {};
      user.emailTemplate.body = req.body.body;
    }

    // Render the (possibly overridden) template against locally-generated
    // sample values — NOT a real invoice. This guarantees the test email
    // does not fabricate business state.
    const fakeInvoice = {
      amount: TEST_EMAIL_SAMPLE.invoiceAmount,
      description: TEST_EMAIL_SAMPLE.invoiceDescription,
      client: { name: TEST_EMAIL_SAMPLE.clientName }
    };

    const { subject, body } = renderForUser(user, fakeInvoice);

    // Recipient is always the authenticated user themselves.
    const to = (user.email || "").trim();
    if (!to) {
      throw new AppError(400, "User has no email address on file");
    }

    await sendEmail(to, subject, body);

    res.json({
      message: "Test email sent",
      sentTo: to,
      subject
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
