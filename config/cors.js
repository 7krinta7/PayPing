const cors = require("cors");

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const parseOrigins = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowlist = (() => {
  const fromEnv = parseOrigins(process.env.CORS_ORIGINS);
  if (fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV !== "production") return DEV_ORIGINS;
  return [];
})();

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  if (process.env.NODE_ENV !== "production") {
    if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  }

  return allowlist.includes(origin);
};

const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) {
      return cb(null, origin); // reflect the requesting origin
    }

    const err = new Error("Not allowed by CORS");
err.status = 403;
return cb(err);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

module.exports = corsMiddleware;
module.exports.isOriginAllowed = isOriginAllowed;
module.exports.allowlist = allowlist;