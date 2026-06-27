# PayPing API server — multi-stage build.
#
# Stage 1: install only production dependencies.
# Stage 2: copy the install + the source, run as the unprivileged `node` user.

# ---------- Stage 1: deps --------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install only production deps. `npm ci` is deterministic given the lockfile.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Stage 2: runtime ----------------------------------------------
FROM node:20-alpine AS runtime

# NODE_ENV=production keeps Express lean (no view cache warnings,
# no dev-only middleware). The actual value is overridable at run time.
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Drop root — `node:20-alpine` ships with an unprivileged `node` user.
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

EXPOSE 5000

# A quick HTTP health probe so orchestrators know the process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]