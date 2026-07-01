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
      description: req.body.description,
      // The validator already trimmed this and ensured it is a non-empty
      // string. We still pass through the original so Mongoose can re-trim
      // in case the schema's `trim` rule ever changes.
      invoiceNumber: req.body.invoiceNumber
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

    // Paid invoices are mostly immutable — the financial record (who,
    // how much, when) is locked once marked paid. Only the user-facing
    // reference (invoiceNumber) and the free-text description remain
    // editable, e.g. so the user can append "Paid via UPI ref 1234" or
    // correct a typo in the assigned invoice number. Any attempt to
    // touch a locked field on a paid invoice is rejected with a clear
    // field-level message rather than silently ignored, so the frontend
    // can surface a useful error.
    const isPaid = invoice.status === "paid";
    const lockedFields = ["client", "amount", "dueDate", "status"];
    const touchedLocked = lockedFields.find((f) => req.body[f] !== undefined);
    if (isPaid && touchedLocked) {
      throw new AppError(
        400,
        `Paid invoices can only update their invoice number and description (field "${touchedLocked}" is locked)`
      );
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

    // invoiceNumber is optional on update — lets legacy invoices be
    // back-filled manually. An explicit empty string clears the value
    // (we set undefined so Mongoose omits it on save, keeping the
    // legacy "no field" state instead of indexing an empty string).
    if (req.body.invoiceNumber !== undefined) {
      const next = String(req.body.invoiceNumber).trim();
      invoice.invoiceNumber = next ? next : undefined;
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
