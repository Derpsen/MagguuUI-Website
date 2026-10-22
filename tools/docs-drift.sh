#!/usr/bin/env bash
# docs-drift.sh - generic docs drift check for Magguu repos. Copy 1:1; all
# repo-specific knowledge lives in the rules file. Run from the repo root.
#
#   tools/docs-drift.sh [rules-file]      (default: .github/docs-drift-rules.txt)
#
# Exit 0 = no hits, 1 = hits (printed as file:line: reason), 2 = usage/config error.
#
# Rules file format (UTF-8, one entry per line):
#   # comment                         ignored, as are blank lines
#   regex<TAB>reason[<TAB>allow-regex] a hit is a line matching regex (ERE,
#                                     case-sensitive) unless it also matches
#                                     allow-regex or a global @allow
#   @files <glob> [<glob> ...]        files to scan (bash globstar; repeatable).
#                                     Default: AGENTS.md MEMORY.md README*.md
#                                     CLAUDE.md .github/copilot-instructions.md
#                                     .cursor/rules/** .grok/**
#   @allow <regex>                    global allow (e.g. dated history lines)
#   @ignorecase                       match rules case-insensitively
#   Optional live-version check (needs curl + jq), all four required:
#   @version-source <url-or-path>     JSON document with the live version
#   @version-jq <jq-expression>       value to read from it, e.g. .build.shortSha
#   @version-doc <file>               doc that states the live version
#   @version-doc-regex <regex>        ERE with ONE capture group; the LAST match
#                                     in the doc is compared with the live value
set -uo pipefail
shopt -s globstar nullglob

rules=${1:-.github/docs-drift-rules.txt}
[ -f "$rules" ] || { echo "docs-drift: rules file '$rules' not found" >&2; exit 2; }

TAB=$'\t'
files_globs=() allows=() rx=() reason=() allow=()
icase=0 vsrc='' vjq='' vdoc='' vdocrx=''

while IFS= read -r line || [ -n "$line" ]; do
  line=${line%$'\r'}
  case "$line" in ''|'#'*) continue ;; esac
  case "$line" in
    '@files '*) read -r -a g <<<"${line#@files }"; files_globs+=("${g[@]}"); continue ;;
    '@allow '*) allows+=("${line#@allow }"); continue ;;
    '@ignorecase') icase=1; continue ;;
    '@version-source '*) vsrc=${line#@version-source }; continue ;;
    '@version-jq '*) vjq=${line#@version-jq }; continue ;;
    '@version-doc '*) vdoc=${line#@version-doc }; continue ;;
    '@version-doc-regex '*) vdocrx=${line#@version-doc-regex }; continue ;;
    '@'*) echo "docs-drift: unknown directive: $line" >&2; exit 2 ;;
  esac
  case "$line" in *"$TAB"*) ;; *) echo "docs-drift: rule without TAB reason: $line" >&2; exit 2 ;; esac
  IFS="$TAB" read -r r why al <<<"$line"
  rx+=("$r"); reason+=("$why"); allow+=("${al:-}")
done < "$rules"

[ ${#files_globs[@]} -gt 0 ] || files_globs=(AGENTS.md MEMORY.md 'README*.md' CLAUDE.md .github/copilot-instructions.md '.cursor/rules/**' '.grok/**')

files=()
for g in "${files_globs[@]}"; do
  for f in $g; do [ -f "$f" ] && files+=("$f"); done
done

gflag=(-E); [ "$icase" = 1 ] && gflag=(-E -i)
global_allow=''
for a in "${allows[@]}"; do global_allow+="${global_allow:+|}($a)"; done

hits=0
report() { printf '%s:%s: %s\n' "$1" "$2" "$3"; hits=$((hits + 1)); }

for f in "${files[@]}"; do
  for i in "${!rx[@]}"; do
    while IFS= read -r m; do
      ln=${m%%:*}; text=${m#*:}
      if [ -n "${allow[$i]}" ] && printf '%s\n' "$text" | grep -q "${gflag[@]}" -- "${allow[$i]}"; then continue; fi
      if [ -n "$global_allow" ] && printf '%s\n' "$text" | grep -q "${gflag[@]}" -- "$global_allow"; then continue; fi
      report "$f" "$ln" "${reason[$i]}"
    done < <(grep -n "${gflag[@]}" -- "${rx[$i]}" "$f" 2>/dev/null || true)
  done
done

if [ -n "$vsrc$vjq$vdoc$vdocrx" ]; then
  if [ -z "$vsrc" ] || [ -z "$vjq" ] || [ -z "$vdoc" ] || [ -z "$vdocrx" ]; then
    echo "docs-drift: @version-* needs source, jq, doc and doc-regex" >&2; exit 2
  fi
  if [[ "$vsrc" =~ ^https?:// ]]; then
    json=$(curl -fsSL --max-time 20 -A 'Mozilla/5.0 (X11; Linux x86_64) docs-drift' "$vsrc") \
      || { echo "docs-drift: cannot fetch $vsrc" >&2; exit 2; }
  else
    json=$(cat -- "$vsrc") || exit 2
  fi
  live=$(printf '%s' "$json" | jq -r "$vjq // empty") || { echo "docs-drift: bad @version-jq" >&2; exit 2; }
  doc_ln='' doc_val=''
  while IFS= read -r m; do
    doc_ln=${m%%:*}
    [[ "${m#*:}" =~ $vdocrx ]] && doc_val=${BASH_REMATCH[1]}
  done < <(grep -nE -- "$vdocrx" "$vdoc" 2>/dev/null || true)
  if [ -z "$doc_val" ]; then
    report "$vdoc" 1 "no live version found (@version-doc-regex), live is '${live:-?}'"
  elif [ -n "$live" ] && [[ "$live" != "$doc_val"* ]] && [[ "$doc_val" != "$live"* ]]; then
    report "$vdoc" "$doc_ln" "documents live '$doc_val', but $vsrc reports '$live'"
  fi
fi

[ "$hits" -eq 0 ] && echo "docs-drift: OK (${#files[@]} files, ${#rx[@]} rules)"
[ "$hits" -eq 0 ]
