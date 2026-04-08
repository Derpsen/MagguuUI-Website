# syntax=docker/dockerfile:1.7
# ─── Build Stage ─────────────────────────────────
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm-slim AS build

WORKDIR /app

# Build tools required by native modules (better-sqlite3, bcrypt).
# Installed only in the build stage — the runtime image stays slim.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    CI=1

# Install dependencies (cached separately from source for faster rebuilds).
# BuildKit cache mount keeps the npm cache across builds without bloating
# any image layer.
COPY package*.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source and build — Nuxt's nitro output is fully standalone in .output/
COPY . .
RUN npm run build

# ─── Production Stage ────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NODE_OPTIONS=--enable-source-maps

# dumb-init forwards signals correctly to the Node process, so `docker stop`
# triggers a clean Nitro shutdown (flushes SQLite WAL, closes sessions).
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init ca-certificates \
  && rm -rf /var/lib/apt/lists/*

LABEL org.opencontainers.image.title="MagguuUI Website" \
      org.opencontainers.image.description="Nuxt website, admin panel, and API for MagguuUI" \
      org.opencontainers.image.source="https://github.com/Derpsen/MagguuUI-Website" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

# Copy built output (Nitro bundles node_modules into .output/server/node_modules)
COPY --from=build /app/.output ./.output

# Create data directories
RUN mkdir -p /app/data /app/uploads

# Note: Running as root for Unraid volume mount compatibility
# (data/ and uploads/ are mounted from host with root ownership)

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
