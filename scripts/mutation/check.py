#!/usr/bin/env python3
"""Hand-made mutation check (no dependency): applies each mutant of mutants.json to a COPY of the repo (never the working
tree), runs the unit tests and reports which mutants the tests kill. Usage: python3 scripts/mutation/check.py [start [end]].
A surviving mutant means a missing test. Requires node/tsx on PATH."""
import subprocess, sys, os, shutil, json
SRC=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); DST=os.environ.get('MUTATION_DIR','/tmp/mutrepo')
shutil.rmtree(DST, ignore_errors=True); os.makedirs(DST)
subprocess.run(['rsync','-a','--exclude','.git','--exclude','node_modules','--exclude','.nuxt','--exclude','.output','--exclude','data','--exclude','test-results','--exclude','playwright-report','--exclude','tests/*.spec.ts',SRC+'/',DST+'/'],check=True)
os.symlink(SRC+'/node_modules', DST+'/node_modules')
env=dict(os.environ)
M=json.load(open(os.path.join(os.path.dirname(__file__),'mutants.json')))
res=[]
START=int(sys.argv[1]) if len(sys.argv)>1 else 0
for i,m in enumerate(M):
    if i<START or i>=int(sys.argv[2] if len(sys.argv)>2 else 999): continue
    f=os.path.join(DST,m['file']); orig=open(f).read()
    if m['find'] not in orig: res.append((m['name'],'NOT-APPLIED')); print(m['name'],'NOT-APPLIED',flush=True); continue
    open(f,'w').write(orig.replace(m['find'],m['repl'],1))
    try:
        r=subprocess.run('timeout -s KILL 90 node --import tsx --test --test-force-exit tests/unit/*.test.ts',shell=True,cwd=DST,env=env,capture_output=True,text=True,timeout=120)
        st='KILLED' if r.returncode!=0 else 'SURVIVED'
    except subprocess.TimeoutExpired:
        st='KILLED'
    open(f,'w').write(orig)
    res.append((m['name'],st)); print(m['name'],st,flush=True)
k=sum(1 for _,s in res if s=='KILLED'); a=sum(1 for _,s in res if s!='NOT-APPLIED')
print(f'SCORE {k}/{a}')
print('SURVIVORS:', [n for n,s in res if s=='SURVIVED'])
