const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const bcrypt = require("bcryptjs");

const validate = require("../middleware/validate");
const {
  profileRules,
  passwordRules,
  notificationsRules
} = require("../middleware/validators/userValidators");
const AppError = require("../utils/AppError");

/**
 * GET /api/user/me
 * Return only safe profile information for the authenticated user.
 */
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    res.json({
      email: user.email,
      businessName: user.businessName || "",
      entitlements: user.entitlements,
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/user/profile
 * Update only the fields the user is allowed to change (businessName).
 * Email and password are deliberately rejected here.
 */
router.patch("/profile", auth, profileRules, validate, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (req.body.businessName !== undefined) {
      user.businessName = String(req.body.businessName).trim();
    }

    await user.save();

    res.json({
      message: "Profile updated",
      email: user.email,
      businessName: user.businessName || ""
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/user/password
 * Change the authenticated user's password.
 *
 * Requires the current password (verified with bcrypt) and a new password
 * that meets the project's minimum length (8 chars). The new password is
 * hashed by the existing User.pre("save") middleware — no separate hash
 * step is introduced.
 */
router.patch("/password", auth, passwordRules, validate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    const user = await User.findById(req.userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      // Generic message — does not leak whether the user exists.
      throw new AppError(400, "Current password is incorrect");
    }

    // The pre("save") middleware will hash this when we save.
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/user/notifications
 * Update notification preferences. Only the email preference is currently
 * user-editable; other fields are ignored at the model level.
 */
router.patch("/notifications", auth, notificationsRules, validate, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const { email } = req.body || {};

    // Only apply if the user is entitled to email reminders.
    if (email === true && user.entitlements?.emailReminders !== true) {
      throw new AppError(403, "Email reminders are not included in your plan");
    }

    if (typeof email === "boolean") {
      user.notificationPreferences.email = email;
    }

    await user.save();

    res.json({
      message: "Notification preferences updated",
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
