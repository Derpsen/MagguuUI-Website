#!/bin/bash
# ============================================================
# MagguuUI — Rebuild & Restart
# Run: bash /mnt/user/appdata/nuxt/rebuild.sh
#
# Baut das Docker Image neu und lässt Unraid den Container
# aus dem Template neu erstellen (kein 3rd Party!)
# ============================================================

set -euo pipefail

# ── Konfiguration ──────────────────────────────────────────
CONTAINER_NAME="Nuxt"
IMAGE_NAME="nuxt"
PROJECT_DIR="/mnt/user/appdata/nuxt"
TEMPLATE="/boot/config/plugins/dockerMan/templates-user/my-${CONTAINER_NAME}.xml"

# ── Farben ─────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[MagguuUI]${NC} $1"; }
ok()   { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC}  $1"; }
err()  { echo -e "${RED}[❌]${NC} $1"; }

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  MagguuUI — Docker Rebuild${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# ── 1. Voraussetzungen prüfen ──────────────────────────────
log "Prüfe Voraussetzungen..."
cd "${PROJECT_DIR}"

if [ ! -f "Dockerfile" ]; then
    err "Kein Dockerfile gefunden in ${PROJECT_DIR}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    err "Kein package.json gefunden in ${PROJECT_DIR}"
    exit 1
fi

if [ ! -f "${TEMPLATE}" ]; then
    err "Kein Unraid Template gefunden: ${TEMPLATE}"
    err "Container muss einmal über die Unraid UI erstellt worden sein!"
    exit 1
fi

ok "Projektdateien + Template vorhanden"

# ── 2. Docker Image bauen ─────────────────────────────────
log "Ziehe aktuelle Base Images..."
docker pull node:24-bookworm >/dev/null
docker pull node:24-bookworm-slim >/dev/null
ok "Base Images aktualisiert"

log "Baue Docker Image: ${IMAGE_NAME} (mit --pull, --no-cache)..."
echo ""

docker build --pull --no-cache -t "${IMAGE_NAME}" .

echo ""
ok "Image gebaut: ${IMAGE_NAME}"

# ── 3. Container über Unraid Template neu erstellen ────────
log "Erstelle Container über Unraid Template neu..."

/usr/bin/php -q \
    /usr/local/emhttp/plugins/dynamix.docker.manager/scripts/update_container \
    "${CONTAINER_NAME}"

ok "Container neu erstellt (managed, kein 3rd Party)"

# ── 4. Alte Images + Build Cache aufräumen ─────────────────
log "Räume alte Images auf..."
IMG_CLEANED=$(docker image prune -f 2>/dev/null | grep "Total reclaimed" || echo "0B")
ok "Image Cleanup: ${IMG_CLEANED}"

log "Räume Build Cache auf..."
CACHE_CLEANED=$(docker builder prune -f 2>/dev/null | grep -i "total" | tail -1 || echo "0B")
ok "Build Cache Cleanup: ${CACHE_CLEANED}"

# ── 5. Zusammenfassung ─────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Rebuild abgeschlossen!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Container:  ${CONTAINER_NAME}"
echo -e "  Image:      ${IMAGE_NAME}"
echo -e "  Template:   ${TEMPLATE}"
echo ""
echo -e "  Logs:       docker logs -f ${CONTAINER_NAME}"
echo -e "  Shell:      docker exec -it ${CONTAINER_NAME} bash"
echo -e "  Neustart:   docker restart ${CONTAINER_NAME}"
echo ""
