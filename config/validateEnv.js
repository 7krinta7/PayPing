// Fail-fast environment variable validator.
//
// Usage:
//   const validateEnv = require("./config/validateEnv");
//   validateEnv(["MONGO_URI", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASS"]);
//
// Behaviour:
//   - Missing or whitespace-only required vars => exit 1 with a grouped error.
//   - In production, weak JWT_SECRET values => exit 1.
//   - Malformed optional vars (PORT, CORS_ORIGINS, NODE_ENV) => exit 1.
//
// Silent on success.

const logger = require("../utils/logger");

const WEAK_JWT_SECRETS = new Set([
  "secret",
  "changeme",
  "change-me",
  "changethis",
  "default",
  "your-secret-key",
  "your_jwt_secret",
]);

function isBlank(value) {
  return !value || !String(value).trim();
}

function isIntegerInRange(value, min, max) {
  if (!/^\d+$/.test(String(value).trim())) return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

function looksLikeOrigin(value) {
  // http(s)://host[:port][/path] — accept anything that parses as a URL
  // and has an http(s) protocol. This is intentionally permissive since
  // production deployments routinely include sub-paths / ports.
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function validateEnv(requiredVars) {
  const missing = requiredVars.filter((name) => isBlank(process.env[name]));

  if (missing.length > 0) {
    process.stderr.write("Missing required environment variable(s):\n");
    for (const name of missing) {
      process.stderr.write(`  - ${name}\n`);
    }
    process.stderr.write("\nServer cannot start. Set them in your .env file or process environment.\n");
    process.exit(1);
  }

  const isProd = process.env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  // NODE_ENV must be a known value if set.
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== undefined && !["development", "test", "production"].includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: development, test, production (got "${nodeEnv}")`);
  }

  // PORT must be a positive integer if set.
  const port = process.env.PORT;
  if (port !== undefined && !isIntegerInRange(port, 1, 65535)) {
    errors.push(`PORT must be a positive integer between 1 and 65535 (got "${port}")`);
  }

  // CORS_ORIGINS must be a comma-separated list of http(s) URLs.
  const cors = process.env.CORS_ORIGINS;
  if (cors !== undefined && cors.trim()) {
    const bad = cors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !looksLikeOrigin(s));
    if (bad.length > 0) {
      errors.push(`CORS_ORIGINS contains invalid URL(s): ${bad.join(", ")}`);
    }
  }

  // JWT_SECRET strength check (production only).
  if (isProd && process.env.JWT_SECRET) {
    const secret = String(process.env.JWT_SECRET).trim();
    if (secret.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters in production");
    } else if (WEAK_JWT_SECRETS.has(secret.toLowerCase())) {
      errors.push("JWT_SECRET matches a known weak value — choose a strong, unique secret");
    }
  }

  // Soft warnings — exit non-zero is not warranted, but flag misconfig.
  if (process.env.ENABLE_WHATSAPP === "true" && isBlank(process.env.WHATSAPP_API_KEY)) {
    warnings.push("ENABLE_WHATSAPP=true but WHATSAPP_API_KEY is not set");
  }

  if (errors.length > 0) {
    process.stderr.write("Invalid environment configuration:\n");
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.stderr.write("\nServer cannot start. Fix the values above and try again.\n");
    process.exit(1);
  }

  if (warnings.length > 0) {
    for (const w of warnings) logger.warn(w);
  }
}

module.exports = validateEnv;
