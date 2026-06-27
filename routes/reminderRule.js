const express = require("express");
const router = express.Router();
const ReminderRule = require("../models/ReminderRule");
const auth = require("../middleware/auth");

const validate = require("../middleware/validate");
const { createRules, updateRules } = require("../middleware/validators/reminderRuleValidators");
const AppError = require("../utils/AppError");

// LIST rules for the authenticated user.
router.get("/", auth, async (req, res, next) => {
  try {
    const rules = await ReminderRule.find({ user: req.userId }).sort({
      offsetDays: 1,
      createdAt: 1
    });
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

// CREATE a rule.
router.post("/", auth, createRules(), validate, async (req, res, next) => {
  try {
    // Pick only the fields the client is allowed to set; user, _id,
    // and timestamps come from the server to prevent cross-user writes.
    const allowed = ["name", "offsetDays", "channel", "enabled", "repeat", "repeatIntervalDays"];
    const value = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) value[key] = req.body[key];
    }

    const rule = await ReminderRule.create({
      user: req.userId,
      ...value
    });

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

// UPDATE a rule (scoped to the current user).
router.patch("/:id", auth, updateRules, validate, async (req, res, next) => {
  try {
    const allowed = ["name", "offsetDays", "channel", "enabled", "repeat", "repeatIntervalDays"];
    const value = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) value[key] = req.body[key];
    }

    const rule = await ReminderRule.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!rule) {
      throw new AppError(404, "Reminder rule not found");
    }

    Object.assign(rule, value);
    await rule.save();

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// DELETE a rule (scoped to the current user).
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const rule = await ReminderRule.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!rule) {
      throw new AppError(404, "Reminder rule not found");
    }

    await rule.deleteOne();
    res.json({ message: "Reminder rule deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
