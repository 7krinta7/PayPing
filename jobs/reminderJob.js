const cron = require("node-cron");
const Invoice = require("../models/Invoice");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const sendWhatsApp = require("../utils/sendWhatsApp");

console.log("✅ Reminder job file loaded");

// Runs daily at 9 AM
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const overdueInvoices = await Invoice.find({
      
      status: "pending",
      dueDate: { $lt: now }
    }).populate("client", "name email");

    for (const invoice of overdueInvoices) {
      console.log("DEBUG invoice.client =", invoice.client);

      if (!invoice.client) {
  console.warn(
    `⚠️ Skipping invoice ${invoice._id} — client missing`
  );
  continue;
}

      const user = await User.findById(invoice.user);
      if (!user) continue;

      // 🔁 Monthly WhatsApp usage reset (stateless)
      const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

      if (user.usage?.billingMonth !== currentMonth) {
        user.usage = {
          whatsappThisMonth: 0,
          billingMonth: currentMonth
        };
        await user.save();
      }

      // 🔒 ATOMIC LOCK — only one send per invoice per day
      const lockResult = await Invoice.updateOne(
        {
          _id: invoice._id,
          status: "pending",
          $or: [
            { lastReminderSentAt: { $exists: false } },
            { lastReminderSentAt: { $lt: todayStart } }
          ]
        },
        {
          $set: { lastReminderSentAt: new Date() }
        }
      );

      if (lockResult.modifiedCount === 0) continue;

      const message = `
Hi ${invoice.client.name},

This is a reminder that ₹${invoice.amount} is pending.

Due date: ${invoice.dueDate.toDateString()}

– PayPing
`;

      let sent = false;

      // 📲 WHATSAPP (priority)
      const WHATSAPP_MONTHLY_LIMIT = 100;

      if (
        process.env.ENABLE_WHATSAPP === "true" &&
        user.entitlements?.whatsappReminders &&
        user.notificationPreferences?.whatsapp &&
        user.whatsappNumber &&
        user.usage.whatsappThisMonth < WHATSAPP_MONTHLY_LIMIT
      ) {
        try {
          await sendWhatsApp(
            user.whatsappNumber,
            `₹${invoice.amount} pending. Due ${invoice.dueDate.toDateString()}`
          );

          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "sent",
                lastDeliveryChannel: "whatsapp",
                lastDeliveryError: null
              },
              $inc: {
                reminderCount: 1,
                whatsappReminderCount: 1
              }
            }
          );

          user.usage.whatsappThisMonth += 1;
          await user.save();

          sent = true;
        } catch (err) {
          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "failed",
                lastDeliveryChannel: "whatsapp",
                lastDeliveryError: err.message
              }
            }
          );
        }
      }

      // 📧 EMAIL (fallback)
      if (
        !sent &&
        user.entitlements?.emailReminders &&
        user.notificationPreferences?.email &&
        invoice.client.email
      ) {
        try {
          await sendEmail(
            invoice.client.email,
            "Payment Reminder",
            message
          );

          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "sent",
                lastDeliveryChannel: "email",
                lastDeliveryError: null
              },
              $inc: {
                reminderCount: 1,
                emailReminderCount: 1
              }
            }
          );

          sent = true;
        } catch (err) {
          await Invoice.updateOne(
            { _id: invoice._id },
            {
              $set: {
                lastDeliveryStatus: "failed",
                lastDeliveryChannel: "email",
                lastDeliveryError: err.message
              }
            }
          );
        }
      }

      if (sent) {
        console.log(`✅ Reminder sent | invoice=${invoice._id}`);
      }
    }
  } catch (error) {
    console.error("❌ Reminder job error:", error);
  }
});
