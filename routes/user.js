const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

/**
 * Update notification preferences
 * Users can ONLY enable channels they have paid for
 */
router.patch("/notifications", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { email, whatsapp, whatsappNumber } = req.body;

    // 🔒 ENFORCE PAID ENTITLEMENTS

    if (email === true && user.entitlements.emailReminders !== true) {
      return res.status(403).json({
        message: "Email reminders are not included in your plan"
      });
    }

    if (whatsapp === true && user.entitlements.whatsappReminders !== true) {
      return res.status(403).json({
        message: "WhatsApp reminders require a paid add-on"
      });
    }

    // ✅ UPDATE PREFERENCES SAFELY

    if (typeof email === "boolean") {
      user.notificationPreferences.email = email;
    }

    if (typeof whatsapp === "boolean") {
      user.notificationPreferences.whatsapp = whatsapp;
    }

    if (whatsappNumber) {
      user.whatsappNumber = whatsappNumber;
    }

    await user.save();

    res.json({
      message: "Notification preferences updated successfully",
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    console.error("Notification preference update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
