#!/usr/bin/env python3
"""Hand-made mutation check (no dependency): applies each mutant of mutants.json to a COPY of the repo (never the working
tree), runs the unit tests and reports which mutants the tests kill. Usage: python3 scripts/mutation/check.py [start [end]].
A surviving mutant means a missing test. Requires node/tsx on PATH.

Hard limits (house rule): every test run is a child in its own process group under `nice -n 19` with a hard timeout
(MUTATION_TIMEOUT, default 90 s per mutant) and killpg(SIGKILL) on expiry, so a mutant that loops forever dies with its
node children. A mutant killed by the timeout counts as killed and is reported separately as KILLED (timeout). An overall
deadline (MUTATION_TOTAL_TIMEOUT, default 840 s) stops the run; unrun mutants are listed and the exit code is non-zero.
After the run every process left in the scratch copy is killed and reported. The runner self-test (mutationRunner.test.ts, slow, no
product code) is not part of the per-mutant run."""
import sys, os, shutil, json, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from limited import run_limited, kill_in_dir
SRC=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); DST=os.environ.get('MUTATION_DIR','/tmp/mutrepo')
PER=int(os.environ.get('MUTATION_TIMEOUT','90')); TOTAL=int(os.environ.get('MUTATION_TOTAL_TIMEOUT','840'))
kill_in_dir(DST)
shutil.rmtree(DST, ignore_errors=True); os.makedirs(DST)
subprocess.run(['rsync','-a','--exclude','.git','--exclude','node_modules','--exclude','.nuxt','--exclude','.output','--exclude','data','--exclude','test-results','--exclude','playwright-report','--exclude','tests/*.spec.ts',SRC+'/',DST+'/'],check=True)
os.symlink(SRC+'/node_modules', DST+'/node_modules')
env=dict(os.environ); env.pop('NODE_TEST_CONTEXT', None)  # else a nested node --test runs nothing and every mutant would 'survive'
M=json.load(open(os.environ.get('MUTANTS_FILE') or os.path.join(os.path.dirname(__file__),'mutants.json')))
res=[]; skipped=[]; t0=time.time()
START=int(sys.argv[1]) if len(sys.argv)>1 else 0
END=int(sys.argv[2]) if len(sys.argv)>2 else 999
try:
    for i,m in enumerate(M):
        if i<START or i>=END: continue
        if time.time()-t0>TOTAL: skipped.append(m['name']); continue
        f=os.path.join(DST,m['file']); orig=open(f).read()
        if m['find'] not in orig: res.append((m['name'],'NOT-APPLIED')); print(m['name'],'NOT-APPLIED',flush=True); continue
        open(f,'w').write(orig.replace(m['find'],m['repl'],1))
        try:
            files=sorted(os.path.join('tests/unit',x) for x in os.listdir(os.path.join(DST,'tests/unit')) if x.endswith('.test.ts') and x != 'mutationRunner.test.ts')
            how,rc,_=run_limited(['node','--import','tsx','--test','--test-force-exit']+files,cwd=DST,env=env,timeout=PER)
            st='KILLED (timeout)' if how=='TIMEOUT' else ('KILLED' if rc!=0 else 'SURVIVED')
        finally:
            open(f,'w').write(orig)
        res.append((m['name'],st)); print(m['name'],st,flush=True)
finally:
    left=kill_in_dir(DST)
    if left: print('killed leftover processes in scratch copy:',left,flush=True)
k=sum(1 for _,s in res if s=='KILLED'); kt=sum(1 for _,s in res if s=='KILLED (timeout)'); a=sum(1 for _,s in res if s!='NOT-APPLIED')
print(f'SCORE {k+kt}/{a} (killed by assertion {k}, killed by timeout {kt})')
print('SURVIVORS:', [n for n,s in res if s=='SURVIVED'])
if skipped: print('NOT RUN (total deadline):', skipped)
sys.exit(1 if skipped or any(s in ('SURVIVED','NOT-APPLIED') for _,s in res) else 0)
