const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Client = require("../models/Client");
const Invoice = require("../models/Invoice");
const ReminderHistory = require("../models/ReminderHistory");
const auth = require("../middleware/auth");

// GET DASHBOARD STATS
router.get("/stats", auth, async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const userFilter = { user: userId };
    const now = new Date();

    const [
      totalClients,
      pendingInvoices,
      overdueInvoices,
      outstandingAgg,
      recentActivity
    ] = await Promise.all([
      Client.countDocuments(userFilter),
      Invoice.countDocuments({ ...userFilter, status: "pending" }),
      Invoice.countDocuments({ ...userFilter, status: "pending", dueDate: { $lt: now } }),
      Invoice.aggregate([
        { $match: { ...userFilter, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      // Last 5 reminder events for the dashboard "Recent Activity" card.
      // Reuses the existing ReminderHistory collection and its populated
      // shape so the client gets invoice + client.name without an extra
      // round-trip.
      ReminderHistory.find(userFilter)
        .populate({
          path: "invoice",
          select: "_id amount client",
          populate: { path: "client", select: "_id name" }
        })
        .sort({ sentAt: -1, createdAt: -1 })
        .limit(5)
    ]);

    const outstandingAmount = outstandingAgg[0]?.total ?? 0;

    res.json({
      totalClients,
      pendingInvoices,
      overdueInvoices,
      outstandingAmount,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;