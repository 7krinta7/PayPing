/**
 * Structured logger.
 *
 * - In production: single-line JSON (consumable by log aggregators).
 * - In development: human-readable line with timestamp + level.
 *
 * The shape is intentionally tiny — the goal is consistent envelopes
 * with `level`, `msg`, and a `meta` blob, not a feature-complete logger.
 */

const isProd = process.env.NODE_ENV === "production";

function format(level, msg, meta) {
  if (isProd) {
    const line = {
      level,
      time: new Date().toISOString(),
      msg: typeof msg === "string" ? msg : String(msg),
    };
    if (meta && typeof meta === "object") {
      Object.assign(line, meta);
    }
    return JSON.stringify(line);
  }
  const ts = new Date().toISOString();
  const metaStr = meta ? " " + JSON.stringify(meta) : "";
  return `${ts} [${level}] ${msg}${metaStr}`;
}

function info(msg, meta) {
  console.log(format("info", msg, meta));
}

function warn(msg, meta) {
  console.warn(format("warn", msg, meta));
}

function error(msg, meta) {
  console.error(format("error", msg, meta));
}

module.exports = { info, warn, error };
