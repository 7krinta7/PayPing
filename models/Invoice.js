const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    paidAt: {
      type: Date
    },
    description: {
      type: String
    },

    // 🧾 User-assigned invoice number. Optional on the schema so legacy
    // invoices (pre-this-field) keep working without a migration — the
    // /api/invoices POST validator enforces presence for new invoices
    // and the field is editable through PATCH /api/invoices/:id. The
    // unique-per-user index below is `sparse` so documents without an
    // invoiceNumber (existing rows) do not collide on the unique key.
    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: 50
    },

    // 🔔 Reminder tracking
    lastReminderSentAt: {
      type: Date
    },
    reminderCount: {
      type: Number,
      default: 0
    },
    emailReminderCount: {
  type: Number,
  default: 0
},
whatsappReminderCount: {
  type: Number,
  default: 0
},
// 📦 Delivery tracking
lastDeliveryStatus: {
  type: String,
  enum: ["sent", "failed"]
},
lastDeliveryChannel: {
  type: String,
  enum: ["email", "whatsapp"]
},
lastDeliveryError: {
  type: String
}


  },
  { timestamps: true }
);

// Per-user uniqueness for the user-assigned invoice number. `sparse: true`
// means documents without an `invoiceNumber` (legacy rows predating the
// field) are excluded from the index entirely, so they never collide on
// the unique key. Two invoices that both have a number must still differ
// on at least one of { user, invoiceNumber }.
InvoiceSchema.index(
  { user: 1, invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      invoiceNumber: {
        $exists: true,
        $type: "string"
      }
    },
    name: "user_invoiceNumber_unique"
  }
);
module.exports = mongoose.model("Invoice", InvoiceSchema);