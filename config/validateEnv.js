// Fail-fast environment variable validator.
// Usage: validateEnv(["MONGO_URI", "JWT_SECRET"])
// Exits the process with code 1 if any required variable is missing or blank.
// Silent on success.

function validateEnv(requiredVars) {
  const missing = requiredVars.filter(
    (name) => !process.env[name] || !process.env[name].trim()
  );

  if (missing.length === 0) return;

  console.error("Missing required environment variable(s):");
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  console.error("");
  console.error("Server cannot start. Set them in your .env file or process environment.");
  process.exit(1);
}

module.exports = validateEnv;