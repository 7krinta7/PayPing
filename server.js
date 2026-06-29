require("dotenv").config();
const validateEnv = require("./config/validateEnv");
validateEnv([
  "MONGO_URI",
  "JWT_SECRET",
  "BREVO_API_KEY",
]);

require("./models/Client");
require("./models/ReminderRule");
require("./models/ReminderHistory");
require("./jobs/reminderJob");

const invoiceRoutes = require("./routes/invoice");
const clientRoutes = require("./routes/client");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const dashboardRoutes = require("./routes/dashboard");
const reminderRuleRoutes = require("./routes/reminderRule");
const reminderHistoryRoutes = require("./routes/reminderHistory");
const emailTemplateRoutes = require("./routes/emailTemplate");

const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const corsMiddleware = require("./config/cors");
const auth = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const { authLimiter, passwordLimiter, generalLimiter } = require("./middleware/rateLimit");
const logger = require("./utils/logger");

const app = express();

// Trust the first hop when behind a reverse proxy in production so
// `req.ip` and the rate limiter see the real client IP from X-Forwarded-For.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers (X-Frame-Options, X-Content-Type-Options, etc.).
app.use(helmet());

// gzip responses.
app.use(compression());

// Request logging — combined format in production, dev-friendly in dev.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// JSON body parser with a small limit so a runaway client can't
// allocate unbounded memory.
app.use(express.json({ limit: "100kb" }));

(async () => {
  await connectDB();

  app.use(corsMiddleware);

  // Auth endpoints are brute-force targets — gate them with a tight limiter.
  app.use("/api/auth", authLimiter);

  // Defensive ceiling on all /api/* traffic.
  app.use("/api", generalLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/invoices", invoiceRoutes);

  // The password endpoint gets its own tighter limiter on top of the general one.
  app.use("/api/user/password", passwordLimiter);
  app.use("/api/user", userRoutes);

  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/reminder-rules", reminderRuleRoutes);
  app.use("/api/reminder-history", reminderHistoryRoutes);
  app.use("/api/email-template", emailTemplateRoutes);

  app.get("/api/protected", auth, (req, res) => {
    res.json({ message: "Protected route accessed", userId: req.userId });
  });

  // Liveness probe — no auth, no DB dependency.
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get("/", (req, res) => {
    res.send("PayPing server running");
  });

  // 404 fallback (must come after all routers).
  app.use(notFound);

  // Centralised error handler (must come last).
  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // ---- Graceful shutdown ---------------------------------------------
  // SIGTERM is what container orchestrators send. SIGINT is what
  // Ctrl+C sends in a terminal. Both paths close the HTTP server
  // (refuses new connections, waits for in-flight to drain) and then
  // close the Mongo connection before exiting.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down`);

    const forceExit = setTimeout(() => {
      logger.error("Forced shutdown after 10s");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.close();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown", { message: err.message });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Surface unhandled errors loudly so they don't go to /dev/null.
  process.on("unhandledRejection", (reason) => {
    logger.error("unhandledRejection", {
      message: reason?.message || String(reason)
    });
  });
  process.on("uncaughtException", (err) => {
    logger.error("uncaughtException", { message: err.message, stack: err.stack });
    process.exit(1);
  });
})();