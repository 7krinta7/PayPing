const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");

// CREATE INVOICE
router.post("/", auth, async (req, res) => {
  try {
    const invoice = new Invoice({
      user: req.userId,
      client: req.body.client,
      amount: req.body.amount,
      dueDate: req.body.dueDate,
      description: req.body.description
    });

    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET UNPAID INVOICES
router.get("/pending", auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({
      user: req.userId,
      status: "pending"
    }).populate("client", "name email");

    res.json(invoices);
  } catch (error) {
    console.error("INVOICE LIST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// MARK INVOICE PAID
router.patch("/:id/pay", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "paid") {
      return res.json({ message: "Already paid", invoice });
    }

    invoice.status = "paid";
    invoice.paidAt = new Date();

    await invoice.save();

    res.json({ message: "Invoice marked paid", invoice });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
