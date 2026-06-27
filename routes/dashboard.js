const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Client = require("../models/Client");
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");

// GET DASHBOARD STATS
router.get("/stats", auth, async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const userFilter = { user: userId };
    const now = new Date();

    const [totalClients, pendingInvoices, overdueInvoices, outstandingAgg] = await Promise.all([
      Client.countDocuments(userFilter),
      Invoice.countDocuments({ ...userFilter, status: "pending" }),
      Invoice.countDocuments({ ...userFilter, status: "pending", dueDate: { $lt: now } }),
      Invoice.aggregate([
        { $match: { ...userFilter, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const outstandingAmount = outstandingAgg[0]?.total ?? 0;

    res.json({
      totalClients,
      pendingInvoices,
      overdueInvoices,
      outstandingAmount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;