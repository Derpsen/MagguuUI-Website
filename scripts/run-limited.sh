#!/bin/sh
# run-limited.sh SECONDS cmd args... : run a test/build command under a hard time limit.
# The child gets its own session/process group (setsid), runs at nice 19, is SIGKILLed after SECONDS (+5 s grace) and the
# WHOLE group is killed afterwards, so no node/playwright/dev-server child can survive. Exit 124 on timeout.
secs=$1; shift
[ -n "$secs" ] && [ $# -gt 0 ] || { echo "usage: $0 SECONDS cmd..." >&2; exit 2; }
setsid nice -n 19 timeout -k 5 -s KILL "$secs" "$@" &
pid=$!
trap 'kill -s KILL -- -$pid 2>/dev/null; exit 143' INT TERM
wait $pid; rc=$?
kill -s KILL -- -$pid 2>/dev/null
exit $rc
