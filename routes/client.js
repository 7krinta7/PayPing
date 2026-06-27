const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const auth = require("../middleware/auth");

const validate = require("../middleware/validate");
const { createRules, updateRules } = require("../middleware/validators/clientValidators");
const AppError = require("../utils/AppError");

// CREATE CLIENT
router.post("/", auth, createRules, validate, async (req, res, next) => {
  try {
    const client = await Client.create({
      user: req.userId,
      name: String(req.body.name).trim(),
      email: req.body.email,
      phone: req.body.phone
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

// GET ALL CLIENTS FOR USER
router.get("/", auth, async (req, res, next) => {
  try {
    const clients = await Client.find({ user: req.userId });
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

// EDIT CLIENT
router.patch("/:id", auth, updateRules, validate, async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!client) {
      throw new AppError(404, "Client not found");
    }

    if (req.body.name !== undefined) {
      client.name = String(req.body.name).trim();
    }

    if (req.body.email !== undefined) {
      client.email = req.body.email;
    }

    if (req.body.phone !== undefined) {
      client.phone = req.body.phone;
    }

    await client.save();

    res.json({ message: "Client updated", client });
  } catch (error) {
    next(error);
  }
});

// DELETE CLIENT
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!client) {
      throw new AppError(404, "Client not found");
    }

    await client.deleteOne();

    res.json({ message: "Client deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
