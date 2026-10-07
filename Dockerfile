# syntax=docker/dockerfile:1.7
# ─── Build Stage ─────────────────────────────────
# node:24-bookworm-slim multi-arch index digest (2026-10-06)
ARG NODE_VERSION=24
ARG NODE_DIGEST=sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST} AS build

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

# Install all dependencies for the build stage (cached separately from source
# for faster rebuilds). Runtime only receives Nitro's standalone .output, so
# dev-only tooling like @nuxt/eslint never lands in the final image.
# BuildKit cache mount keeps the npm cache across builds without bloating
# any image layer.
COPY package*.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi

# Copy source and build — Nuxt's nitro output is fully standalone in .output/
COPY . .
RUN npm run build

# ─── Production Stage ────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST}

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NODE_OPTIONS=--enable-source-maps \
    PUID=99 \
    PGID=100

# dumb-init forwards signals correctly to the Node process, so `docker stop`
# triggers a clean Nitro shutdown (flushes SQLite WAL, closes sessions).
RUN apt-get update \
  && apt-get upgrade -y --no-install-recommends \
  && apt-get install -y --no-install-recommends dumb-init gosu ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/local/lib/node_modules/npm \
            /usr/local/lib/node_modules/corepack \
            /opt/yarn-v1.22.22 \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

LABEL org.opencontainers.image.title="MagguuUI Website" \
      org.opencontainers.image.description="Nuxt website, admin panel, and API for MagguuUI" \
      org.opencontainers.image.source="https://github.com/Derpsen/MagguuUI-Website" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

# Copy built output (Nitro bundles node_modules into .output/server/node_modules)
COPY --from=build /app/.output ./.output

# Create data directories. The entrypoint chowns these to PUID:PGID and drops.
# Live mounts are root-owned today; PUID=0 keeps the old root process.
RUN mkdir -p /app/data /app/uploads
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
