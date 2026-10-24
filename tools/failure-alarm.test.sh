#!/usr/bin/env bash
# Dry-run test for .github/workflows/failure-alarm.yml: extracts the script after the last `run: |`,
# runs it against a fake `gh` and a local HTTP server (127.0.0.1 only, no real webhook, no network).
# Exit 0 = all checks pass. Needs bash, jq, curl, python3, sed, awk.
set -u
cd "$(dirname "$0")/.."
work=$(mktemp -d)
trap 'kill "${srv:-0}" 2>/dev/null; rm -rf "$work"' EXIT
fails=0
check() { if [ "$2" = "ok" ]; then echo "ok   $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }

awk '/^        run: \|$/ {found = NR} {l[NR] = $0} END {for (i = found + 1; i <= NR; i++) print substr(l[i], 11)}' \
    .github/workflows/failure-alarm.yml > "$work/alarm.sh"

TOKEN_FAKE="ghp_$(printf 'A%.0s' {1..30})"
BEARER_VAL="sekret-bearer-value-123"
mkdir "$work/bin"
cat > "$work/bin/gh" <<GH
#!/usr/bin/env bash
case "\$*" in
  *"/runs?head_sha="*) [ -n "\${FAKE_PRIOR:-}" ] && echo '{"workflow_runs":[{"id":7,"name":"Build","conclusion":"failure"},{"id":42,"name":"Build","conclusion":null}]}' || echo '{"workflow_runs":[{"id":42,"name":"Build","conclusion":null},{"id":8,"name":"Drift","conclusion":"failure"}]}' ;;
  *"/attempts/"*) echo '{"jobs":[{"id":11,"name":"validate","conclusion":"failure","steps":[{"name":"Lint","conclusion":"failure"},{"name":"Checkout","conclusion":"success"}]},{"id":12,"name":"ok-job","conclusion":"success","steps":[]},{"id":13,"name":"alarm","conclusion":null,"steps":[]}]}' ;;
  *"/jobs/11/logs"*)
    for i in \$(seq 1 40); do echo "2026-10-24T10:00:00.0000000Z line \$i"; done
    echo "2026-10-24T10:00:01.0000000Z token $TOKEN_FAKE leaked"
    echo "2026-10-24T10:00:02.0000000Z curl -H 'Authorization: Bearer abc.def' x"
    echo "2026-10-24T10:00:03.0000000Z value $BEARER_VAL here"
    echo "2026-10-24T10:00:04.0000000Z ##[error]Process completed with exit code 1."
    echo "2026-10-24T10:00:05.0000000Z Post job cleanup." ;;
esac
GH
chmod +x "$work/bin/gh"

cat > "$work/srv.py" <<'PY'
import http.server, sys, json
out = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        with open(out, "a") as fh:
            fh.write(json.dumps({"auth": self.headers.get("Authorization"), "ct": self.headers.get("Content-Type"),
                                 "body": body.decode()}) + "\n")
        self.send_response(200); self.end_headers(); self.wfile.write(b"SECRET-RESPONSE-BODY")
    def log_message(self, *a): pass
s = http.server.HTTPServer(("127.0.0.1", 0), H)
print(s.server_address[1], flush=True)
s.serve_forever()
PY
python3 "$work/srv.py" "$work/req.jsonl" > "$work/port" &
srv=$!
for _ in $(seq 1 50); do [ -s "$work/port" ] && break; sleep 0.1; done
port=$(cat "$work/port")
URL="http://127.0.0.1:${port}/hook-path-secret"

run() { # run <attempt> <url> <bearer>
    PATH="$work/bin:$PATH" GH_TOKEN=x WEBHOOK_URL="$2" BEARER="$3" REPO=Derpsen/MagguuUI-Website WORKFLOW=Build RUN_ID=42 \
        RUN_ATTEMPT="$1" RUN_URL=https://example.invalid/run/42 SHA=0123456789abcdef0123456789abcdef01234567 \
        BRANCH=main EVENT=push bash "$work/alarm.sh" 2>&1
}

: > "$work/req.jsonl"
out=$(run 1 "$URL" "$BEARER_VAL"); rc=$?
[ "$rc" = 0 ] && check "attempt 1 exits 0" ok || check "attempt 1 exits 0" bad
[ "$(wc -l < "$work/req.jsonl")" = 1 ] && check "exactly one request sent" ok || check "exactly one request sent" bad
req=$(cat "$work/req.jsonl")
[ "$(printf '%s' "$req" | jq -r .auth)" = "Bearer $BEARER_VAL" ] && check "Authorization bearer header" ok || check "Authorization bearer header" bad
body=$(printf '%s' "$req" | jq -r .body)
[ "$(printf '%s' "$body" | jq -r .dedupe_key)" = "Build@0123456789abcdef0123456789abcdef01234567" ] && check "dedupe_key workflow@sha" ok || check "dedupe_key workflow@sha" bad
[ "$(printf '%s' "$body" | jq -r '.failed_jobs | length')" = 1 ] && check "only the failed job reported" ok || check "only the failed job reported" bad
[ "$(printf '%s' "$body" | jq -r '.failed_jobs[0].failed_steps[0]')" = Lint ] && check "failed step name" ok || check "failed step name" bad
[ "$(printf '%s' "$body" | jq -r '.failed_jobs[0].log_tail' | wc -l)" -le 20 ] && check "log tail <= 20 lines" ok || check "log tail <= 20 lines" bad
printf '%s' "$body" | jq -r '.failed_jobs[0].log_tail' | grep -q 'exit code 1' && check "log ends at the ##[error] line" ok || check "log ends at the ##[error] line" bad
printf '%s' "$body" | grep -q 'Post job cleanup' && check "post-error noise cut" bad || check "post-error noise cut" ok
if printf '%s' "$body" | grep -q "$TOKEN_FAKE\|abc.def\|$BEARER_VAL"; then check "secrets masked in payload" bad; else check "secrets masked in payload" ok; fi
printf '%s' "$body" | grep -q '\*\*\*' && check "mask marker present" ok || check "mask marker present" bad
if printf '%s' "$out" | grep -q "$BEARER_VAL\|hook-path-secret\|127.0.0.1\|SECRET-RESPONSE-BODY"; then check "script output hides secrets and response body" bad; else check "script output hides secrets and response body" ok; fi

: > "$work/req.jsonl"
run 2 "$URL" "$BEARER_VAL" > /dev/null; rc=$?
{ [ "$rc" = 0 ] && [ ! -s "$work/req.jsonl" ]; } && check "re-run (attempt 2) sends nothing" ok || check "re-run (attempt 2) sends nothing" bad
: > "$work/req.jsonl"
FAKE_PRIOR=1 run 1 "$URL" "$BEARER_VAL" > /dev/null; rc=$?
{ [ "$rc" = 0 ] && [ ! -s "$work/req.jsonl" ]; } && check "earlier failure of same workflow+commit dedupes" ok || check "earlier failure of same workflow+commit dedupes" bad
run 1 "" "$BEARER_VAL" > /dev/null; rc=$?
{ [ "$rc" = 0 ] && [ ! -s "$work/req.jsonl" ]; } && check "empty URL secret skips silently" ok || check "empty URL secret skips silently" bad
run 1 "$URL" "" > /dev/null; rc=$?
{ [ "$rc" = 0 ] && [ ! -s "$work/req.jsonl" ]; } && check "empty bearer secret skips silently" ok || check "empty bearer secret skips silently" bad
run 1 "http://127.0.0.1:1/x" "$BEARER_VAL" > /dev/null; rc=$?
[ "$rc" = 0 ] && check "unreachable webhook still exits 0" ok || check "unreachable webhook still exits 0" bad

[ "$fails" = 0 ] && echo "failure-alarm: all checks passed" || echo "failure-alarm: $fails check(s) failed"
exit "$fails"
