# ─── Build Stage ─────────────────────────────────
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
# --legacy-peer-deps: resolves optional peer dependency conflicts (zod v4 etc.)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ─── Production Stage ────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

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
