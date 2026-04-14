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
# Only emit ANSI escape codes if stdout is actually a terminal — keeps log
# files clean when the script is piped (e.g. `bash rebuild.sh > deploy.log`).
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    GREEN='' YELLOW='' RED='' BLUE='' NC=''
fi

log()  { echo -e "${BLUE}[MagguuUI]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }

# Fail loud: print a clear marker on any unexpected error so `set -e` exits
# don't look like a silent "script just stopped".
on_error() {
    local exit_code=$?
    local line_no=$1
    err "Rebuild aborted (exit ${exit_code}) at line ${line_no}"
    err "See output above for the failing command."
    exit "${exit_code}"
}
trap 'on_error $LINENO' ERR
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

# Make sure the Unraid container manager script is actually there — otherwise
# the rebuild would succeed but the container-recreate step later would fail
# after we've already rebuilt the image.
UNRAID_UPDATE_SCRIPT="/usr/local/emhttp/plugins/dynamix.docker.manager/scripts/update_container"
if [ ! -x "${UNRAID_UPDATE_SCRIPT}" ]; then
    err "Unraid update_container script nicht gefunden: ${UNRAID_UPDATE_SCRIPT}"
    err "Läuft dieses Script wirklich auf einem Unraid-Host?"
    exit 1
fi

ok "Projektdateien + Template vorhanden"

# Safety: warn if the working tree has uncommitted changes — the normal deploy
# path does `git reset --hard origin/main`, which would silently discard them.
if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    warn "Working tree has uncommitted changes in ${PROJECT_DIR}"
    warn "If you run 'git reset --hard origin/main', these changes will be LOST."
    warn "Rebuild continues — but double-check before running the deploy oneliner."
fi

# Safety: warn if disk is nearly full — docker build can silently corrupt images
DISK_FREE_MB=$(df -Pm "${PROJECT_DIR}" | awk 'NR==2 {print $4}')
if [ -n "${DISK_FREE_MB}" ] && [ "${DISK_FREE_MB}" -lt 2048 ]; then
    warn "Only ${DISK_FREE_MB} MB free on the deploy volume — docker build may fail"
fi

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
BUILD_DURATION=""
if [ "${SHOULD_BUILD}" = "1" ]; then
    BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    BUILD_START=$(date +%s)

    log "Baue Docker Image: ${IMAGE_NAME} (Commit ${CURRENT_COMMIT_SHORT})..."
    echo ""

    docker build \
        --pull \
        --build-arg VCS_REF="${CURRENT_COMMIT}" \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        -t "${IMAGE_NAME}" \
        .

    BUILD_END=$(date +%s)
    BUILD_SECS=$((BUILD_END - BUILD_START))
    BUILD_DURATION="$((BUILD_SECS / 60))m $((BUILD_SECS % 60))s"

    echo ""
    ok "Image gebaut: ${IMAGE_NAME} (in ${BUILD_DURATION})"
else
    if container_exists; then
        ok "Kein neuer Commit - Build und Container-Recreate werden übersprungen"
        exit 0
    fi

    warn "Kein neuer Commit, aber Container fehlt - erstelle Container aus vorhandenem Image neu"
fi

# ── 3. Container über Unraid Template neu erstellen ────────
log "Erstelle Container über Unraid Template neu..."

/usr/bin/php -q "${UNRAID_UPDATE_SCRIPT}" "${CONTAINER_NAME}"

ok "Container neu erstellt (managed, kein 3rd Party)"

# ── 3b. Health-Check: warte bis Container antwortet ────────
log "Warte auf Container-Health (max 60s)..."
HEALTH_OK=0
for i in $(seq 1 30); do
    if docker exec "${CONTAINER_NAME}" \
        node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
        >/dev/null 2>&1; then
        HEALTH_OK=1
        ok "Container ist gesund (nach ${i}x2s)"
        break
    fi
    sleep 2
done
if [ "${HEALTH_OK}" != "1" ]; then
    warn "Container antwortet nach 60s noch nicht — prüfe 'docker logs ${CONTAINER_NAME}'"
fi

# ── 4. Nur dangling Images aufräumen ───────────────────────
# NOTE: Wir lassen den Build-Cache absichtlich stehen — der npm cache-mount
# aus dem Dockerfile macht den nächsten Build deutlich schneller. Build-Cache
# kann bei Bedarf manuell mit `docker builder prune -f` gelöscht werden.
if [ "${SHOULD_BUILD}" = "1" ]; then
    log "Räume dangling Images auf..."
    IMG_CLEANED=$(docker image prune -f 2>/dev/null | grep "Total reclaimed" || echo "0B")
    ok "Image Cleanup: ${IMG_CLEANED}"
fi

# ── 5. Zusammenfassung ─────────────────────────────────────
IMAGE_SIZE=$(docker image inspect "${IMAGE_NAME}" --format '{{.Size}}' 2>/dev/null | awk '{ printf "%.1f MB", $1/1024/1024 }' || echo "unknown")

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Rebuild abgeschlossen!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Container:  ${CONTAINER_NAME}"
echo -e "  Image:      ${IMAGE_NAME} (${IMAGE_SIZE})"
echo -e "  Template:   ${TEMPLATE}"
if [ -n "${EXISTING_COMMIT_SHORT}" ] && [ "${EXISTING_COMMIT}" != "${CURRENT_COMMIT}" ]; then
    echo -e "  Commit:     ${EXISTING_COMMIT_SHORT} → ${CURRENT_COMMIT_SHORT}"
else
    echo -e "  Commit:     ${CURRENT_COMMIT_SHORT}"
fi
if [ -n "${BUILD_DURATION}" ]; then
    echo -e "  Build-Zeit: ${BUILD_DURATION}"
fi
echo ""
echo -e "  Logs:       docker logs -f ${CONTAINER_NAME}"
echo -e "  Shell:      docker exec -it ${CONTAINER_NAME} bash"
echo -e "  Neustart:   docker restart ${CONTAINER_NAME}"
echo -e "  Force:      FORCE_REBUILD=1 bash rebuild.sh"
echo ""
