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
  return allowlist.includes(origin);
};

const corsMiddleware = cors({
  origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

module.exports = corsMiddleware;
module.exports.isOriginAllowed = isOriginAllowed;
module.exports.allowlist = allowlist;