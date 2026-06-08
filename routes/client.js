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

module.exports = router;
