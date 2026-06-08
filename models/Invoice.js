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

module.exports = mongoose.model("Invoice", InvoiceSchema);
