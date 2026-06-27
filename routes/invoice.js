const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");

const validate = require("../middleware/validate");
const { createRules, updateRules } = require("../middleware/validators/invoiceValidators");
const AppError = require("../utils/AppError");

// CREATE INVOICE
router.post("/", auth, createRules, validate, async (req, res, next) => {
  try {
    const invoice = await Invoice.create({
      user: req.userId,
      client: req.body.client,
      amount: req.body.amount,
      dueDate: req.body.dueDate,
      description: req.body.description
    });

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

// LIST INVOICES
router.get("/", auth, async (req, res, next) => {
  try {
    const invoices = await Invoice.find({
      user: req.userId
    }).populate("client", "name email");

    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// GET UNPAID INVOICES
router.get("/pending", auth, async (req, res, next) => {
  try {
    const invoices = await Invoice.find({
      user: req.userId,
      status: "pending"
    }).populate("client", "name email");

    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// EDIT INVOICE
router.patch("/:id", auth, updateRules, validate, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new AppError(400, "Cannot edit a paid invoice");
    }

    if (req.body.amount !== undefined) {
      invoice.amount = req.body.amount;
    }

    if (req.body.dueDate !== undefined) {
      invoice.dueDate = req.body.dueDate;
    }

    if (req.body.description !== undefined) {
      invoice.description = req.body.description;
    }

    await invoice.save();

    res.json({ message: "Invoice updated", invoice });
  } catch (error) {
    next(error);
  }
});

// MARK INVOICE PAID
router.patch("/:id/pay", auth, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.status === "paid") {
      return res.json({ message: "Already paid", invoice });
    }

    invoice.status = "paid";
    invoice.paidAt = new Date();

    await invoice.save();

    res.json({ message: "Invoice marked paid", invoice });
  } catch (error) {
    next(error);
  }
});

// DELETE INVOICE
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    await invoice.deleteOne();

    res.json({ message: "Invoice deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
