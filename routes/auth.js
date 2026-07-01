const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const validate = require("../middleware/validate");
const { registerRules, loginRules } = require("../middleware/validators/authValidators");
const AppError = require("../utils/AppError");

// POST /api/auth/register
router.post("/register", registerRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new AppError(409, "User already exists");
    }

    // `name` is collected by the registration UI but is not (yet) part
    // of `registerRules`. It's enforced here — required + trimmed for
    // new sign-ups — so existing rows (where the schema field is
    // optional) keep loading cleanly without a migration.
    const rawName = req.body?.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      throw new AppError(400, "name is required");
    }

    const user = new User({ email, password, name });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post("/login", loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(401, "Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Same response shape as /register so the frontend can hydrate
    // `AuthContext.user` identically across both flows. `name` may be
    // undefined for users who registered before the field existed —
    // the frontend treats that as "no name" and falls back gracefully.
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name || "",
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
