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
FORCE_REBUILD="${FORCE_REBUILD:-0}"

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
get_image_commit() {
    local image_commit
    image_commit="$(
        docker image inspect "${IMAGE_NAME}" \
        --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
        2>/dev/null || true
    )"

    if [ "${image_commit}" = "<no value>" ]; then
        image_commit=""
    fi

    echo "${image_commit}"
}
container_exists() {
    docker container inspect "${CONTAINER_NAME}" >/dev/null 2>&1
}

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

if ! command -v git >/dev/null 2>&1; then
    err "git ist nicht installiert/verfügbar"
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    err "docker ist nicht installiert/verfügbar"
    exit 1
fi

if [ ! -f "${TEMPLATE}" ]; then
    err "Kein Unraid Template gefunden: ${TEMPLATE}"
    err "Container muss einmal über die Unraid UI erstellt worden sein!"
    exit 1
fi

ok "Projektdateien + Template vorhanden"

CURRENT_COMMIT="$(git rev-parse HEAD)"
CURRENT_COMMIT_SHORT="$(git rev-parse --short HEAD)"
EXISTING_COMMIT="$(get_image_commit)"
EXISTING_COMMIT_SHORT="${EXISTING_COMMIT:0:7}"
SHOULD_BUILD=1

if [ "${FORCE_REBUILD}" = "1" ]; then
    warn "FORCE_REBUILD=1 gesetzt - Build wird erzwungen"
elif [ -n "${EXISTING_COMMIT}" ] && [ "${CURRENT_COMMIT}" = "${EXISTING_COMMIT}" ]; then
    SHOULD_BUILD=0
    ok "Image ${IMAGE_NAME} ist bereits auf Commit ${CURRENT_COMMIT_SHORT}"
else
    if [ -z "${EXISTING_COMMIT}" ]; then
        warn "Kein buildbares Commit-Label am bestehenden Image gefunden - baue einmal neu"
    else
        log "Neuer Commit erkannt: ${EXISTING_COMMIT_SHORT} -> ${CURRENT_COMMIT_SHORT}"
    fi
fi

# ── 2. Docker Image nur bei neuem Commit bauen ─────────────
if [ "${SHOULD_BUILD}" = "1" ]; then
    BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    log "Baue Docker Image: ${IMAGE_NAME} (Commit ${CURRENT_COMMIT_SHORT})..."
    echo ""

    docker build \
        --pull \
        --build-arg VCS_REF="${CURRENT_COMMIT}" \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        -t "${IMAGE_NAME}" \
        .

    echo ""
    ok "Image gebaut: ${IMAGE_NAME}"
else
    if container_exists; then
        ok "Kein neuer Commit - Build und Container-Recreate werden übersprungen"
        exit 0
    fi

    warn "Kein neuer Commit, aber Container fehlt - erstelle Container aus vorhandenem Image neu"
fi

# ── 3. Container über Unraid Template neu erstellen ────────
log "Erstelle Container über Unraid Template neu..."

/usr/bin/php -q \
    /usr/local/emhttp/plugins/dynamix.docker.manager/scripts/update_container \
    "${CONTAINER_NAME}"

ok "Container neu erstellt (managed, kein 3rd Party)"

# ── 4. Alte Images + Build Cache aufräumen ─────────────────
if [ "${SHOULD_BUILD}" = "1" ]; then
    log "Räume alte Images auf..."
    IMG_CLEANED=$(docker image prune -f 2>/dev/null | grep "Total reclaimed" || echo "0B")
    ok "Image Cleanup: ${IMG_CLEANED}"

    log "Räume Build Cache auf..."
    CACHE_CLEANED=$(docker builder prune -f 2>/dev/null | grep -i "total" | tail -1 || echo "0B")
    ok "Build Cache Cleanup: ${CACHE_CLEANED}"
fi

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
echo -e "  Force:      FORCE_REBUILD=1 bash rebuild.sh"
echo ""
