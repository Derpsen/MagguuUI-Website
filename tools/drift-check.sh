#!/usr/bin/env bash
# drift-check.sh - Magguu product-drift guard (MagguuUI-Website). Run from repo root.
# Exit 0 = clean, 1 = drift found (each finding printed as file:line: message).
# Adapted from the shared magguu-ci draft: Node 26 engine, guard files excluded.
set -uo pipefail

NODE_ENGINE=">=26.12"
fail=0
report() { printf '%s:%s: %s\n' "$1" "$2" "$3"; fail=1; }

list_files() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files
  else
    find . -type f -not -path './.git/*' -not -path '*/node_modules/*' | sed 's|^\./||'
  fi
}

# 1) Banned addon names (case-insensitive, whole word). History/docs and the
#    code + tests that implement the ban itself are listed in tools/drift-allow.txt.
banned='(WIM|WindTools|KeystoneLoot)'
while IFS= read -r f; do
  case "$f" in
    *CHANGELOG*|*MEMORY*|AGENTS.md|tools/drift-check.sh) continue ;;
    *package-lock.json|*.png|*.jpg|*.jpeg|*.webp|*.svg|*.ico|*.ttf|*.otf|*.woff|*.woff2|*.zip) continue ;;
  esac
  [ -f "$f" ] || continue
  while IFS=: read -r ln _; do
    report "$f" "$ln" "banned name (WIM/WindTools/KeystoneLoot)"
  done < <(grep -inwE "$banned" -- "$f" 2>/dev/null || true)
done < <(list_files | grep -vxF -f <(grep -v '^#' tools/drift-allow.txt 2>/dev/null || true))

# 2) Containers run as uid 99: USER 99[:gid], or entrypoint drop via PUID=99.
if [ -f Dockerfile ]; then
  users=$(grep -nE '^[[:space:]]*USER[[:space:]]+' Dockerfile || true)
  if [ -n "$users" ]; then
    last=$(printf '%s\n' "$users" | tail -n1)
    ln=${last%%:*}; u=$(printf '%s' "${last#*:}" | awk '{print $2}')
    case "$u" in 99|99:*) ;; *) report Dockerfile "$ln" "final USER is '$u', expected 99" ;; esac
  elif ! grep -qE 'PUID[=:-]+99([^0-9]|$)' Dockerfile docker-entrypoint.sh 2>/dev/null; then
    report Dockerfile 1 "no USER 99 and no PUID=99 privilege drop"
  fi
fi

# 3) engines.node must match policy (trailing .0 tolerated).
if [ -f package.json ]; then
  ln=$(grep -nE '"node"[[:space:]]*:' package.json | head -n1 | cut -d: -f1)
  eng=$(node -e 'try{process.stdout.write(String((require("./package.json").engines||{}).node||""))}catch(e){}' 2>/dev/null || true)
  norm=$(printf '%s' "$eng" | tr -d ' ' | sed -E 's/(\.0)+$//')
  [ "$norm" = "$NODE_ENGINE" ] || report package.json "${ln:-1}" "engines.node is '${eng:-<missing>}', expected '$NODE_ENGINE'"
fi

[ "$fail" -eq 0 ] && echo "drift-check: OK"
exit "$fail"
