# ─── Build Stage ─────────────────────────────────
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
# --legacy-peer-deps: resolves optional peer dependency conflicts (zod v4 etc.)
RUN npm install --legacy-peer-deps --no-audit --no-fund && npm cache clean --force

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ─── Production Stage ────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

LABEL org.opencontainers.image.title="MagguuUI Website"
LABEL org.opencontainers.image.description="Nuxt website, admin panel, and API for MagguuUI"
LABEL org.opencontainers.image.source="https://github.com/Derpsen/MagguuUI-Website"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"

# Copy built output
COPY --from=build /app/.output ./.output

# Create data directories
RUN mkdir -p /app/data /app/uploads

# Note: Running as root for Unraid volume mount compatibility
# (data/ and uploads/ are mounted from host with root ownership)

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
