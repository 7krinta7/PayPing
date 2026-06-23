require("dotenv").config();
const validateEnv = require("./config/validateEnv");
validateEnv(["MONGO_URI", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASS"]);

require("./models/Client");
require("./jobs/reminderJob");

const invoiceRoutes = require("./routes/invoice");
const clientRoutes = require("./routes/client");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const dashboardRoutes = require("./routes/dashboard");

const express = require("express");
const connectDB = require("./config/db");
const corsMiddleware = require("./config/cors");
const auth = require("./middleware/auth");

const app = express();

(async () => {
  await connectDB();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.get("/api/protected", auth, (req, res) => {
    res.json({ message: "Protected route accessed", userId: req.userId });
  });
  app.get("/", (req, res) => {
    res.send("PayPing server running");
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

  