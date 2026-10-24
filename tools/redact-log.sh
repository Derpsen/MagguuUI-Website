#!/usr/bin/env bash
# redact-log.sh - masks secrets in CI log text. stdin -> stdout, one line in, one line out.
# Used by .github/workflows/failure-alarm.yml for the log tail it sends to the escalation
# webhook; tested by tools/redact-log.test.sh (ported from Derpsen/MagguuUI tools/redact-log.sh, commits 7544478 + 47b2633).
#
# Same coverage as MagguuBot's ci-alarm.yml redact_log(), plus the explicit secret values:
#   - the exact values of the env vars WEBHOOK_URL and BEARER (and any extra value listed,
#     one per line, in REDACT_VALUES), also when a log line has changed around them
#   - GitHub tokens (ghp_/gho_/ghu_/ghs_/ghr_/github_pat_), Slack tokens (xox[abposr]-), Stripe keys
#     (sk_/rk_ live/test), Google API keys (AIza...), JWTs (eyJ...), AWS access key ids (AKIA/ASIA/...),
#     Discord webhook URLs (with or without scheme), every other URL, Bearer/Basic/Token values
#   - key=value / key: value pairs whose key mentions token, secret, password, passwd, pwd, pass(phrase),
#     api key, key, auth(orization), credential, cookie, bearer, private key (also URL-encoded: password%3Dx)
#   - CLI flags: --password x / --token x / --secret x ... (the value after the flag), curl -u user:pw,
#     --user user:pw, --proxy-user user:pw (-u only when the value looks like user:pw)
#   - AWS secret access keys: `aws_secret_access_key <value>` and a standalone 40-char [A-Za-z0-9/+=] token
#     that has a digit, an upper- and a lower-case letter, contains a "/" and at most 3 of them, and does not
#     start with "/" (a 40-char token without "/" falls under the long-string rule; plain paths, dotted names
#     and hex digests do not qualify)
#   - @everyone / @here and <@id> / <@&id> mentions (a log line must never ping a channel)
#   - long opaque strings (32+ chars of [A-Za-z0-9+_=-]); PEM private key blocks: the BEGIN/END marker
#     lines (also single-line and short ones) and the base64 / header body lines in between are replaced whole;
#     any line that still carries an Authorization / Cookie header is replaced whole
#   - NOT masked on purpose (a log line stays readable): a standalone 40- or 64-char lowercase hex digest
#     (git commit SHA, sha256) and github.com run / job / commit / pull / issue URLs without query string.
#     Trade-off: a bare 40-hex token with no keyword around it (an old-style GitHub token, say) is left as is;
#     with a key, "token ", "bearer " or a flag in front it is still masked.
# Also strips ANSI colour codes and the leading ISO timestamp of GitHub log lines.
# Never prints its environment. Needs bash, GNU sed, awk (POSIX awk is enough: mawk/gawk).
set -u -o pipefail

awk '
  function scrub(line, secret,   out, i) {
    if (secret == "" || length(secret) < 4) return line
    out = ""
    while ((i = index(line, secret)) > 0) {
      out = out substr(line, 1, i - 1) "[redacted-secret]"
      line = substr(line, i + length(secret))
    }
    return out line
  }
  BEGIN {
    n = split(ENVIRON["REDACT_VALUES"], extra, "\n")
  }
  {
    line = $0
    line = scrub(line, ENVIRON["WEBHOOK_URL"])
    line = scrub(line, ENVIRON["BEARER"])
    for (k = 1; k <= n; k++) line = scrub(line, extra[k])
    print line
  }' |
  sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g; s/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z //' |
  awk '
    # PEM private key blocks. A marker line (BEGIN or END ... PRIVATE KEY, single-line blocks included) is
    # replaced whole; while a block is open every following base64 / header line is replaced too. A line of
    # anything else closes the block again, so a quoted "BEGIN PRIVATE KEY" in a script cannot swallow the log.
    {
      if ($0 ~ /(BEGIN|END)[A-Z ]*PRIVATE KEY/) {
        inpem = ($0 ~ /BEGIN[A-Z ]*PRIVATE KEY/ && $0 !~ /END[A-Z ]*PRIVATE KEY/)
        print "[line redacted]"
      } else if (inpem && $0 ~ /^[[:space:]]*$/) {
        print    # blank line between PEM headers and body: the block stays open
      } else if (inpem && $0 ~ /^[[:space:]]*([A-Za-z0-9+\/=]+|[A-Za-z][A-Za-z0-9-]*:.*)[[:space:]]*$/) {
        print "[line redacted]"
      } else {
        inpem = 0
        print
      }
    }' |
  sed -E '/(authorization[[:space:]]*:|cookie[[:space:]]*:|x-plex)/I s/.*/[line redacted]/' |
  sed -E 's/(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,})/[redacted-gh]/g' |
  sed -E 's/xox[abposr]-[A-Za-z0-9-]{8,}/[redacted-slack]/g' |
  sed -E 's/\b[sr]k_(live|test)_[A-Za-z0-9]{8,}/[redacted-stripe]/g' |
  sed -E 's/\bAIza[0-9A-Za-z_-]{35}/[redacted-google-key]/g' |
  sed -E 's/eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}(\.[A-Za-z0-9_-]*)?/[redacted-jwt]/g' |
  sed -E 's/\b(AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA)[0-9A-Z]{16}\b/[redacted-aws-key]/g' |
  sed -E 's#https?://([a-z0-9-]+\.)*discord(app)?\.com/api(/v[0-9]+)?/webhooks/[^[:space:]"<>)]+#[redacted-discord-webhook]#Ig' |
  sed -E 's#([a-z0-9-]+\.)*discord(app)?\.com/api(/v[0-9]+)?/webhooks/[^[:space:]"<>)]+#[redacted-discord-webhook]#Ig' |
  sed -E 's#(https)://(github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(actions/runs/[0-9]+(/(job|attempts)/[0-9]+)?|commit/[0-9a-f]{7,40}|pull/[0-9]+|issues/[0-9]+))([.,]?([[:space:]"<>)]|$))#\1\x03\2\6#g; s#(https)://(github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(actions/runs/[0-9]+(/(job|attempts)/[0-9]+)?|commit/[0-9a-f]{7,40}|pull/[0-9]+|issues/[0-9]+))([.,]?([[:space:]"<>)]|$))#\1\x03\2\6#g' |
  sed -E 's#[A-Za-z][A-Za-z0-9+.-]*://[^[:space:]"<>)]+#[redacted-url]#g' |
  sed -E 's/@(everyone|here)/[redacted-mention]/Ig; s/<@[!&]?[0-9]+>/[redacted-mention]/g' |
  sed -E 's/\b(bearer|basic|token)([[:space:]]+(bearer|basic|token))+\b/\1/Ig; s/\b(bearer|basic|token)[[:space:]]+[A-Za-z0-9._~+\/=-]+/\1 [redacted]/Ig' |
  sed -E 's/(--(password|passwd|passphrase|pass|pwd|token|secret|api-?key|access-token|auth-token|client-secret|secret-key|secret-access-key|private-key|credentials?))[[:space:]]+("[^"]*"|\x27[^\x27]*\x27|[^[:space:]-][^[:space:]]*)/\1 [redacted]/Ig' |
  sed -E 's/(^|[[:space:]])(-u[[:space:]]+|--(proxy-)?user(=|[[:space:]]+))[^[:space:]:]*:[^[:space:]]+/\1\2[redacted]/g' |
  sed -E 's/\b(aws[_-]?secret[_-]?(access[_-]?)?key)[[:space:]]+[A-Za-z0-9\/+][A-Za-z0-9\/+=]*/\1 [redacted]/Ig' |
  sed -E 's/(^|[^A-Za-z0-9])((([A-Za-z0-9]+[_.-])*pass(phrase)?))["\x27]?[[:space:]]*[:=][[:space:]]*("[^"]*"|\x27[^\x27]*\x27|[^[:space:],;&]+)/\1\2=[redacted]/Ig' |
  sed -E 's/(([A-Za-z0-9_.-]*(token|secret|passw(or)?d|pwd|api[_-]?key|key|auth(orization)?|credentials?|cookie|bearer)[A-Za-z0-9_.-]*|([A-Za-z0-9]+[_.-])*pass(phrase)?)%3[DdAa])([^[:space:]&"\x27%]|%([013-9A-Fa-f][0-9A-Fa-f]|2[0-57-9A-Fa-f]))+/\1[redacted]/Ig' |
  sed -E 's/([A-Za-z0-9_.-]*(token|secret|passw(or)?d|pwd|api[_-]?key|key|auth(orization)?|credentials?|cookie|bearer)[A-Za-z0-9_.-]*)["\x27]?[[:space:]]*[:=][[:space:]]*("[^"]*"|\x27[^\x27]*\x27|[^[:space:],;&]+)/\1=[redacted]/Ig' |
  awk '
    # Standalone 40-char AWS secret access key with a "/" (the long-string rule below cannot see it: the "/"
    # splits it into short pieces). Digit + upper + lower + "/" (at most 3, not leading) keeps paths, hex
    # digests and ordinary words out.
    {
      out = ""; rest = $0
      while (match(rest, /[A-Za-z0-9\/+=]+/)) {
        tok = substr(rest, RSTART, RLENGTH)
        pre = (RSTART > 1) ? substr(rest, RSTART - 1, 1) : ""
        post = substr(rest, RSTART + RLENGTH, 1)
        hit = 0
        if (length(tok) == 40 && pre !~ /[_.-]/ && post !~ /[_.-]/ && substr(tok, 1, 1) != "/" \
            && tok ~ /[0-9]/ && tok ~ /[a-z]/ && tok ~ /[A-Z]/ && tok ~ /\// && tok !~ /\/.*\/.*\/.*\// && tok !~ /=/) hit = 1
        out = out substr(rest, 1, RSTART - 1) (hit ? "[redacted-aws-secret]" : tok)
        rest = substr(rest, RSTART + RLENGTH)
      }
      print out rest
    }' |
  sed -E 's/(^|[^A-Za-z0-9+_-])([0-9a-f]{20})([0-9a-f]{20})([^A-Za-z0-9+_=-]|$)/\1\2\x02\3\4/g; s/(^|[^A-Za-z0-9+_-])([0-9a-f]{20})([0-9a-f]{20})([^A-Za-z0-9+_=-]|$)/\1\2\x02\3\4/g' |
  sed -E 's/(^|[^A-Za-z0-9+_-])([0-9a-f]{16})([0-9a-f]{16})([0-9a-f]{16})([0-9a-f]{16})([^A-Za-z0-9+_=-]|$)/\1\2\x02\3\x02\4\x02\5\6/g; s/(^|[^A-Za-z0-9+_-])([0-9a-f]{16})([0-9a-f]{16})([0-9a-f]{16})([0-9a-f]{16})([^A-Za-z0-9+_=-]|$)/\1\2\x02\3\x02\4\x02\5\6/g' |
  sed -E 's/[A-Za-z0-9+_=-]{32,}/[redacted]/g' |
  sed -E 's/\x02//g; s/\x03/:\/\//g'
