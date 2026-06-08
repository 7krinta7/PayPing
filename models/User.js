const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    // 🔐 Paid feature entitlements
  entitlements: {
    emailReminders: {
      type: Boolean,
      default: false
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
