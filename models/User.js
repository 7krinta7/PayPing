const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Default reminder email template — used the first time a user sends a
 * reminder and as the source of truth for "Reset to Default" in the
 * Settings UI. Mirrors the legacy hard-coded reminder text in
 * `services/reminderScheduler.js` so behaviour is identical when no
 * custom template has been saved.
 */
const DEFAULT_EMAIL_SUBJECT = "Payment Reminder";

const DEFAULT_EMAIL_BODY = `Hi {{clientName}},

This is a friendly reminder that {{businessName}} has an invoice of ₹{{invoiceAmount}} pending.

{{invoiceDescription}}

Due date: {{dueDate}}

Please let us know if you have any questions.

– {{businessName}}`;

// Variables the renderer recognises. Unknown placeholders are left
// unchanged so a typo in a custom template never silently swallows text.
const EMAIL_TEMPLATE_VARS = [
  "businessName",
  "clientName",
  "invoiceAmount",
  "dueDate",
  "invoiceDescription"
];

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // 🏢 Display name shown on invoices and reminders (optional).
  businessName: {
    type: String,
    trim: true
  },
    // 🔐 Paid feature entitlements
  entitlements: {
    // RC1: email reminders are part of the core MVP, so every account
    // is entitled by default. The field is kept on the schema so a
    // future Billing phase can flip it back to false for unpaid plans
    // without a migration. The scheduler gate
    // (`services/reminderScheduler.js`) and the Settings toggle
    // (`routes/user.js`) both honour this value — flipping the default
    // here is what re-enables email reminder sending.
    emailReminders: {
      type: Boolean,
      default: true
    },
    whatsappReminders: {
      type: Boolean,
      default: false
    }
  },

  // 🔔 What user has actually enabled
  notificationPreferences: {
    email: {
      type: Boolean,
      default: false
    },
    whatsapp: {
      type: Boolean,
      default: false
    }
  },

  // 📧 Customizable reminder email template. The legacy code path used a
  // hard-coded subject/body; storing it on the user lets each account
  // personalise reminders. Empty / missing fields fall back to the
  // DEFAULT_EMAIL_SUBJECT / DEFAULT_EMAIL_BODY constants above so users
  // who never touch Settings keep the previous behaviour.
  emailTemplate: {
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ""
    },
    body: {
      type: String,
      maxlength: 5000,
      default: ""
    }
  },

  // 📱 WhatsApp number (only used if paid)
  whatsappNumber: {
    type: String
  },
  // 📊 Usage tracking (for billing & limits)
  usage: {
  whatsappThisMonth: {
    type: Number,
    default: 0
  },
  billingMonth: {
    type: String // format: "YYYY-MM"
  }
}


});

// 🔐 HASH PASSWORD BEFORE SAVE (CORRECT ASYNC VERSION)
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model("User", UserSchema);
module.exports.DEFAULT_EMAIL_SUBJECT = DEFAULT_EMAIL_SUBJECT;
module.exports.DEFAULT_EMAIL_BODY = DEFAULT_EMAIL_BODY;
module.exports.EMAIL_TEMPLATE_VARS = EMAIL_TEMPLATE_VARS;
