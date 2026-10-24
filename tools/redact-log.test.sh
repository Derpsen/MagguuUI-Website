#!/usr/bin/env bash
# Test for tools/redact-log.sh against sample strings (fake secrets only, no network).
# Fixtures for new token shapes are assembled at run time (rep / split literals) so secret scanners see no real-looking literal.
# Exit 0 = all checks pass. Needs bash, GNU sed, awk.
set -u
cd "$(dirname "$0")/.." || exit 1
fails=0
check() { if [ "$2" = ok ]; then echo "ok   $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }

WEBHOOK_FAKE="https://hooks.example.test/in/abc-hook-path-123"
BEARER_FAKE="sekret-bearer-value-123"
red() { WEBHOOK_URL="$WEBHOOK_FAKE" BEARER="$BEARER_FAKE" bash tools/redact-log.sh; }

# gone <name> <input> <leaked-substring> [<expected-marker>]
gone() {
    local out
    out=$(printf '%s\n' "$2" | red)
    if printf '%s' "$out" | grep -qF -- "$3"; then
        check "$1 (leaked: $3)" bad
    elif [ -n "${4:-}" ] && ! printf '%s' "$out" | grep -qF -- "$4"; then
        check "$1 (marker $4 missing in: $out)" bad
    else
        check "$1" ok
    fi
}
# kept <name> <input> <substring that must survive>
kept() {
    local out
    out=$(printf '%s\n' "$2" | red)
    if printf '%s' "$out" | grep -qF -- "$3"; then check "$1" ok; else check "$1 (got: $out)" bad; fi
}

GH="ghp_$(printf 'A%.0s' {1..30})"
PAT="github_pat_$(printf 'B%.0s' {1..30})"
JWT="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc-DEF_123"
gone "GitHub token ghp_" "token $GH leaked" "$GH" "[redacted-gh]"
gone "GitHub fine-grained PAT" "using $PAT now" "$PAT" "[redacted-gh]"
gone "JWT" "id_token is $JWT ok" "eyJhbGci" "[redacted-jwt]"
gone "JWT without signature" "x eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0. y" "eyJzdWIi" "[redacted-jwt]"
gone "Discord webhook URL" "POST https://discord.com/api/webhooks/123456789012345678/AbCdEf_gh-IJkl done" "AbCdEf_gh-IJkl" "[redacted-discord-webhook]"
gone "Discord webhook (discordapp, ptb, v10)" "https://ptb.discordapp.com/api/v10/webhooks/1/XyZ-token_9 end" "XyZ-token_9" "[redacted-discord-webhook]"
gone "Discord webhook id" "https://discord.com/api/webhooks/123456789012345678/AbCdEf" "123456789012345678"
gone "any other URL (path and query)" "GET https://example.test/dl/file.zip?sig=short end" "sig=short" "[redacted-url]"
gone "URL with credentials" "clone https://user:pw1234@host.test/repo.git" "pw1234"
gone "AWS access key id AKIA" "key AKIAIOSFODNN7EXAMPLE used" "AKIAIOSFODNN7EXAMPLE" "[redacted-aws-key]"
gone "AWS temporary key ASIA" "key ASIAIOSFODNN7EXAMPLE used" "ASIAIOSFODNN7EXAMPLE" "[redacted-aws-key]"
gone "AWS secret access key" "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" "wJalrXUtn" "[redacted]"
gone "@everyone" "ping @everyone now" "@everyone" "[redacted-mention]"
gone "@here" "ping @here now" "@here" "[redacted-mention]"
gone "@EVERYONE (case)" "ping @EVERYONE now" "@EVERYONE"
gone "user/role mention" "ping <@123456789> <@&99887766>" "123456789"
gone "Bearer token" "curl --oauth2-bearer Bearer abc.def.ghi123 x" "abc.def.ghi123" "[redacted]"
gone "bearer lowercase" "bearer zzz-top-123456" "zzz-top-123456"
gone "Basic credentials" "Basic dXNlcjpwYXNzd29yZA==" "dXNlcjpwYXNzd29yZA"
gone "Authorization header line" "curl -H 'Authorization: Bearer abc.def' x" "abc.def" "[line redacted]"
gone "Cookie header line" "Cookie: session=abcdef" "abcdef" "[line redacted]"
gone "private key marker line" "-----BEGIN RSA PRIVATE KEY-----" "BEGIN RSA" "[line redacted]"
gone "token=value" "token=abc123def" "abc123def" "token=[redacted]"
gone "secret: value" "secret: topsecretvalue" "topsecretvalue" "secret=[redacted]"
gone "password=value" "password=hunter2" "hunter2" "password=[redacted]"
gone "passwd and pwd" "passwd=aaa111 pwd=bbb222" "bbb222"
gone "api key (api_key / API-KEY)" "api_key=k1k1k1 API-KEY=k2k2k2" "k2k2k2"
gone "key=value" "key=plainvalue" "plainvalue" "key=[redacted]"
gone "prefixed key (MY_SECRET_TOKEN)" "MY_SECRET_TOKEN=zzz999" "zzz999"
gone "quoted value with spaces" 'password="p4ss word here"' "p4ss word here"
gone "JSON style" '{"password": "jsonpw1", "user": "bob"}' "jsonpw1"
gone "authorization=value" "authorization=xyz789" "xyz789"
gone "long opaque string (32+)" "blob abcdefghijklmnopqrstuvwxyz0123456789ABCD end" "abcdefghijklmnopqrstuvwxyz0123456789ABCD" "[redacted]"
gone "exact bearer secret value in free text" "plain with $BEARER_FAKE inside" "$BEARER_FAKE" "[redacted-secret]"
gone "exact webhook secret value (not URL-shaped)" "weird $WEBHOOK_FAKE trail" "abc-hook-path-123"
gone "secret value twice in one line" "$BEARER_FAKE and $BEARER_FAKE" "$BEARER_FAKE"
kept "text around an exact secret survives" "plain with $BEARER_FAKE inside" "plain with"
out=$(printf 'extra-one-secret-9\n' | REDACT_VALUES=$'extra-one-secret-9\nother-two-secret-8' bash tools/redact-log.sh)
if [ "$out" = "[redacted-secret]" ]; then check "REDACT_VALUES extra values" ok; else check "REDACT_VALUES extra values (got: $out)" bad; fi
out=$(printf 'nothing secret-free here: abc\n' | WEBHOOK_URL="" BEARER="" bash tools/redact-log.sh)
if [ -n "$out" ]; then check "empty secrets are not matched everywhere" ok; else check "empty secrets are not matched everywhere" bad; fi
kept "ANSI colours and timestamp stripped" "$(printf '2026-10-24T10:00:00.0000000Z \033[31mError\033[0m: build failed')" "Error: build failed"
if printf '%s\n' "$(printf '2026-10-24T10:00:00.0000000Z \033[31mError\033[0m x')" | red | grep -q "2026-10-24T\|\[31m"; then check "ANSI/timestamp removed" bad; else check "ANSI/timestamp removed" ok; fi
kept "normal build line untouched" "Run luacheck: 11 warnings / 0 errors in 99 files" "Run luacheck: 11 warnings / 0 errors in 99 files"
kept "exit-code line untouched" "##[error]Process completed with exit code 1." "##[error]Process completed with exit code 1."
kept "a job name with 'secret' in it (no key=value) survives" "npm ERR! secret-lint failed on file x.lua" "failed on file x.lua"
kept "file path survives" "MagguuUI_EUI/Wizard.lua:603: unexpected symbol" "MagguuUI_EUI/Wizard.lua:603: unexpected symbol"
# --- additional secret shapes (fixtures are assembled at run time so no scanner sees a real-looking literal) ---
rep() { printf "$1%.0s" $(seq 1 "$2"); }
gone "bearer=value" "bearer=abc123def456" "abc123def456" "bearer=[redacted]"
gone "BEARER=value (case-insensitive)" "BEARER=ABCdef456xyz" "ABCdef456xyz" "BEARER=[redacted]"
gone "Bearer: value" "Bearer: zzz987yyy" "zzz987yyy"
gone "--password value" "mysql --password hunter2 --host db1" "hunter2" "--password [redacted]"
kept "text after --password value survives" "mysql --password hunter2 --host db1" "--host db1"
gone "--password=value" "mysql --password=hunter2 --host db1" "hunter2" "--password=[redacted]"
gone "--token value in quotes" 'tool --token "tok en val" next' "tok en val" "--token [redacted]"
gone "--secret value, --api-key value" "run --secret s3cr3tval --api-key k3yv4l go" "k3yv4l"
gone "--passphrase value and --pass=value" "gpg --passphrase pp1x2y --pass=pp3z4w" "pp3z4w"
kept "a flag that only starts with the word is untouched" "jest --passWithNoTests src" "--passWithNoTests src"
gone "-u user:pw flag" "cu""rl -u alice:s3cr3tpw https://example.test/x" "s3cr3tpw" "-u [redacted]"
gone "--user user:pw flag" "cu""rl --user alice:s3cr3tpw -o out" "s3cr3tpw" "--user [redacted]"
gone "--user=user:pw flag" "cu""rl --user=alice:s3cr3tpw -o out" "s3cr3tpw"
gone "--proxy-user user:pw flag" "cu""rl --proxy-user bob:pr0xypw x" "pr0xypw"
kept "-u without user:pw is untouched (git push -u)" "git push -u origin main" "git push -u origin main"
gone "pass=value" "run pass=hunter3 go" "hunter3" "pass=[redacted]"
gone "passphrase=value" "passphrase=correct-horse-9" "correct-horse-9" "passphrase=[redacted]"
gone "prefixed pass (DB_PASS: value, my-pass=value)" "DB_PASS: dbval1 my-pass=dbval2" "dbval2"
gone "DB_PASS: value" "DB_PASS: dbval1" "dbval1"
kept "words that merely contain 'pass' survive" "tests passed: 5 bypass=1 compass: north pass-through: yes" "tests passed: 5 bypass=1 compass: north pass-through: yes"
gone "URL-encoded password%3D" "data=user%3Dbob%26password%3Dhunter2%26x%3D1" "hunter2" "password%3D[redacted]"
kept "URL-encoded neighbours survive" "data=user%3Dbob%26password%3Dhunter2%26x%3D1" "%26x%3D1"
gone "URL-encoded api_key%3D and lowercase %3d" "q=api_key%3Dabc%2Bdef%26z%3D2 token%3dxyz789" "xyz789"
gone "URL-encoded api_key value with %2B" "q=api_key%3Dabc%2Bdef%26z%3D2" "abc%2Bdef"
gone "URL-encoded PASSWORD%3D (case)" "PASSWORD%3Dupper1" "upper1"
gone "URL-encoded pass%3D" "x&pass%3Dpw77&y" "pw77"
SLACK_B="xox""b-$(rep 1 12)-$(rep 2 13)-abcdEFGH"
gone "Slack bot token xoxb-" "slack $SLACK_B end" "abcdEFGH" "[redacted-slack]"
gone "Slack user token xoxp-" "slack xox""p-123456789-abcdefgh1 end" "abcdefgh1" "[redacted-slack]"
gone "Slack token xoxa-" "slack xox""a-2-abcdefgh2 end" "abcdefgh2" "[redacted-slack]"
gone "Stripe sk_live_" "stripe sk_""live_abcdEFGH1234 end" "abcdEFGH1234" "[redacted-stripe]"
gone "Stripe sk_test_" "stripe sk_""test_abcdEFGH1234 end" "abcdEFGH1234" "[redacted-stripe]"
kept "Stripe publishable key is not a secret" "stripe pk_""live_publishable1234 end" "publishable1234"
GAPI="AIza""Sy$(rep A 33)"
gone "Google API key AIza" "key $GAPI end" "SyAAAA" "[redacted-google-key]"
gone "scheme-less Discord webhook" "join discord.com/api/webhooks/123456789012345678/AbCdEf_gh-IJkl done" "AbCdEf_gh-IJkl" "[redacted-discord-webhook]"
gone "scheme-less Discord webhook (id)" "join discord.com/api/webhooks/123456789012345678/AbCdEf_gh-IJkl done" "123456789012345678"
gone "scheme-less discordapp ptb v10 webhook" "see ptb.discordapp.com/api/v10/webhooks/1/XyZ-tok_9 end" "XyZ-tok_9" "[redacted-discord-webhook]"
kept "text around a scheme-less webhook survives" "join discord.com/api/webhooks/1/abcDEF done" "join "
AWS_SECRET="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
if [ "${#AWS_SECRET}" = 40 ]; then check "AWS secret fixture is 40 chars" ok; else check "AWS secret fixture is 40 chars" bad; fi
gone "aws_secret_access_key value after a space" "aws configure set aws_secret_access_key $AWS_SECRET" "K7MDENG" "aws_secret_access_key [redacted]"
gone "AWS_SECRET_ACCESS_KEY = value (spaced)" "AWS_SECRET_ACCESS_KEY = $AWS_SECRET" "bPxRfi"
gone "standalone 40-char AWS secret key" "found $AWS_SECRET here" "K7MDENG" "[redacted-aws-secret]"
kept "text around a standalone AWS secret survives" "found $AWS_SECRET here" "found "
gone "standalone AWS secret key in JSON" "{\"k\": \"$AWS_SECRET\"}" "bPxRfi"
gone "standalone AWS secret key, other shape" "x Zk3/9aBcDeFgHiJkLmNoPqRsTuVwXyZ012+4567 y" "Zk3/9aBc"
# PEM: marker lines, single-line and short blocks, base64 body lines (markers assembled from $D so the
# test file itself holds no BEGIN/END key span)
D="-----"
PK_B="${D}BEGIN PRIVATE KEY${D}"; PK_E="${D}END PRIVATE KEY${D}"
gone "single-line PEM key" "${PK_B}MIIEvQIBADANBgkqhkiG9w0BAQEF${PK_E}" "MIIEvQ" "[line redacted]"
gone "single-line PEM with escaped newlines" "key: \"${D}BEGIN RSA PRIVATE KEY${D}\\nMIIEow\\n${D}END RSA PRIVATE KEY${D}\"" "MIIEow"
gone "short PEM block body line" "$(printf '%s\nYWJjZA==\n%s' "${D}BEGIN OPENSSH PRIVATE KEY${D}" "${D}END OPENSSH PRIVATE KEY${D}")" "YWJjZA" "[line redacted]"
out=$(printf '%s\nYWJjZA==\n%s\nafter the block\n' "$PK_B" "$PK_E" | red)
if [ "$out" = "$(printf '[line redacted]\n[line redacted]\n[line redacted]\nafter the block')" ]; then check "PEM block: 3 lines masked, next line kept, line count kept" ok; else check "PEM block (got: $out)" bad; fi
out=$(printf 'before\n%s\nVersion: X 1\n\nabcd1234\nlongbody/Zm9vYmFy+Zm9vYmFy==\n%s\nafter\n' "${D}BEGIN PGP PRIVATE KEY BLOCK${D}" "${D}END PGP PRIVATE KEY BLOCK${D}" | red)
if [ "$out" = "$(printf 'before\n[line redacted]\n[line redacted]\n\n[line redacted]\n[line redacted]\n[line redacted]\nafter')" ]; then check "PEM block with header and blank line" ok; else check "PEM block with header (got: $out)" bad; fi
TS="2026-10-24T10:00:00.0000000Z"
out=$(printf '%s %s\n%s c2hvcnQ=\n%s %s\n' "$TS" "$PK_B" "$TS" "$TS" "$PK_E" | red)
if [ "$out" = "$(printf '[line redacted]\n[line redacted]\n[line redacted]')" ]; then check "PEM block behind GitHub timestamps" ok; else check "PEM block with timestamps (got: $out)" bad; fi
gone "END marker alone (truncated log tail)" "${D}END EC PRIVATE KEY${D}" "END EC" "[line redacted]"
out=$(printf 'grep -q "BEGIN PRIVATE KEY" file\nBuild finished in 4s\nnext line\n' | red)
if [ "$out" = "$(printf '[line redacted]\nBuild finished in 4s\nnext line')" ]; then check "a quoted BEGIN PRIVATE KEY does not swallow the following log lines" ok; else check "quoted marker (got: $out)" bad; fi
# --- negatives: normal log text must stay readable ---
SHA40="3d3c42e5aac5ba805825da76410c181273ba90b1"
SHA64="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
kept "40-hex commit SHA survives" "checkout $SHA40 done" "checkout $SHA40 done"
kept "64-hex sha256 survives" "sha256 $SHA64 ok" "sha256 $SHA64 ok"
kept "two commit SHAs in one line survive" "range $SHA40 $SHA40" "range $SHA40 $SHA40"
kept "SHA after '=' survives (GITHUB_SHA=...)" "GITHUB_SHA=$SHA40" "GITHUB_SHA=$SHA40"
kept "SHA in parentheses survives" "HEAD ($SHA40)" "HEAD ($SHA40)"
gone "a 41-char hex run is still a long opaque string" "x ${SHA40}a y" "${SHA40}a" "[redacted]"
gone "hex SHA right behind a token keyword is still masked" "token $SHA40" "$SHA40"
gone "hex value with a key is still masked" "api_key=$SHA40" "$SHA40"
kept "short SHA survives" "commit 3d3c42e done" "commit 3d3c42e done"
kept "Actions run URL survives" "see https://github.com/Derpsen/MagguuUI/actions/runs/123456789 now" "https://github.com/Derpsen/MagguuUI/actions/runs/123456789 now"
kept "Actions job URL survives (trailing dot)" "https://github.com/Derpsen/MagguuUI/actions/runs/123456789/job/9876543." "https://github.com/Derpsen/MagguuUI/actions/runs/123456789/job/9876543."
kept "commit URL in parentheses survives" "($(printf 'https://github.com/Derpsen/MagguuUI/commit/%s' "$SHA40"))" "https://github.com/Derpsen/MagguuUI/commit/$SHA40)"
kept "pull request URL survives" "https://github.com/Derpsen/MagguuUI/pull/42" "https://github.com/Derpsen/MagguuUI/pull/42"
kept "two run URLs on one line survive" "a https://github.com/o/r/actions/runs/1 https://github.com/o/r/actions/runs/2" "https://github.com/o/r/actions/runs/1 https://github.com/o/r/actions/runs/2"
gone "a run URL with a query string is still masked" "https://github.com/Derpsen/MagguuUI/actions/runs/123?token=abc999" "abc999" "[redacted-url]"
gone "a GitHub URL with credentials is still masked" "https://user:pw5544@github.com/Derpsen/MagguuUI/actions/runs/1" "pw5544"
gone "a GitHub URL of another shape is still masked" "https://github.com/Derpsen/MagguuUI/archive/abc.zip" "archive/abc.zip" "[redacted-url]"
kept "file:line path survives" "MagguuUI_EUI/Integration.lua:585: attempt to index nil" "MagguuUI_EUI/Integration.lua:585: attempt to index nil"
kept "AddOns media path survives" "Interface/AddOns/MagguuUI_Media/Shared/Fonts/Expressway.ttf" "Interface/AddOns/MagguuUI_Media/Shared/Fonts/Expressway.ttf"
kept "absolute path survives" "/home/runner/work/MagguuUI/MagguuUI/spec/wizard_spec.lua" "/home/runner/work/MagguuUI/MagguuUI/spec/wizard_spec.lua"
kept "40-char path with a file extension survives" "Interface/AddOns/Magguu123/FontsAndTexturesZ9.tga" "Interface/AddOns/Magguu123/FontsAndTexturesZ9.tga"
kept "a deep 40-char path (4+ slashes) is not an AWS key" "Interface/Addons/Mag1/Fonts/Texturesabcd/Qz" "Interface/Addons/Mag1/Fonts/Texturesabcd/Qz"
kept "plain words around 'key'-less text survive" "luacheck: 0 warnings / 0 errors in 99 files" "luacheck: 0 warnings / 0 errors in 99 files"
# line count: one line in, one line out
lines=$(printf 'a\nb token=x\n\nc\n' | red | wc -l)
if [ "$lines" = 4 ]; then check "line-preserving (4 in, 4 out)" ok; else check "line-preserving (got $lines)" bad; fi
# the script never prints its environment
out=$(printf 'hello\n' | red)
if [ "$out" = hello ]; then check "no environment output" ok; else check "no environment output" bad; fi

[ "$fails" = 0 ] && echo "redact-log: all checks passed" || echo "redact-log: $fails check(s) failed"
exit "$fails"
