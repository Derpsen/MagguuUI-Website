#!/usr/bin/env python3
"""Self-test of the hard time limit: a node child stuck in while(true) (plus a grandchild) must be killed by the
timeout and leave no process behind. Prints OK or exits 1. Used by tests/unit/mutationRunner.test.ts."""
import os, sys, time, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from limited import run_limited, leftovers, kill_leftovers

marker = 'MGLOOP' + uuid.uuid4().hex
# sh -> node (infinite loop, never reads stdin, ignores SIGTERM) and a second background node in the same group
script = f'node -e "process.on(\'SIGTERM\',()=>{{}});/*{marker}*/while(true){{}}" & node -e "/*{marker}*/while(true){{}}"'
t0 = time.time()
status, rc, _ = run_limited(['sh', '-c', script], timeout=3)
took = time.time() - t0
time.sleep(0.3)
left = leftovers(marker)
if left: kill_leftovers(marker)
ok = status == 'TIMEOUT' and took < 15 and not left
# a normal finishing command must pass through untouched, background stragglers of it must be reaped too
marker2 = 'MGSLEEP' + uuid.uuid4().hex
s2, rc2, out2 = run_limited(['sh', '-c', f'sleep 60 & echo hi {marker2}'], timeout=10)
time.sleep(0.3)
ok2 = s2 == 'OK' and rc2 == 0 and 'hi' in out2
print('timeout-case', status, f'{took:.1f}s', 'leftovers', left, '| normal-case', s2, rc2)
sys.exit(0 if (ok and ok2) else 1)
