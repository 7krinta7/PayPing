const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const auth = require("../middleware/auth");

// CREATE CLIENT
router.post("/", auth, async (req, res) => {
  try {
    const client = new Client({
      user: req.userId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    });

    await client.save();
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL CLIENTS FOR USER
router.get("/", auth, async (req, res) => {
  try {
    const clients = await Client.find({ user: req.userId });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// EDIT CLIENT
router.patch("/:id", auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string" || !req.body.name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      client.name = req.body.name.trim();
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
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
