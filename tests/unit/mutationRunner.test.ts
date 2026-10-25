// House rule: every test/mutation run has a hard time limit with a process-group kill, so a looping child can never
// outlive its wrapper (a mutation run once spun 7 h on a VM core). These tests prove it with real loops.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const alive = (marker: string) => { const r = spawnSync('pgrep', ['-f', marker], { encoding: 'utf8' }); return r.stdout.trim() }
const sleepMs = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

describe('hard time limit with process-group kill', () => {
  test('python runner: a while(true) node child (ignoring SIGTERM) is killed by the timeout and nothing is left', () => {
    const out = execFileSync('python3', ['scripts/mutation/selftest.py'], { cwd: root, encoding: 'utf8', timeout: 60_000, killSignal: 'SIGKILL' })
    assert.match(out, /timeout-case TIMEOUT/)
    assert.match(out, /leftovers \[\]/)
    assert.match(out, /normal-case OK 0/)
  })

  test('run-limited.sh: kills the whole group (loop + sleeper) on timeout and reaps stragglers of a normal exit', () => {
    const marker = `SHLOOP${process.pid}`
    const t0 = Date.now()
    const r = spawnSync('scripts/run-limited.sh', ['2', 'sh', '-c', `node -e "/*${marker}*/while(true){}" & sleep 97`], { cwd: root, timeout: 30_000, killSignal: 'SIGKILL' })
    assert.equal(r.status, 124)
    assert.ok(Date.now() - t0 < 15_000)
    sleepMs(300)
    assert.equal(alive(marker), '', 'loop process survived the timeout')
    const r2 = spawnSync('scripts/run-limited.sh', ['10', 'sh', '-c', `sleep 98${process.pid % 10} & echo ok`], { cwd: root, encoding: 'utf8', timeout: 30_000, killSignal: 'SIGKILL' })
    assert.equal(r2.status, 0)
    sleepMs(300)
    assert.equal(alive(`sleep 98${process.pid % 10}`), '', 'background straggler survived a normal exit')
  })
})

describe('check.py end to end', () => {
  test('a mutant that loops forever is killed by the timeout, reported separately, and leaves no process behind', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mgmut-'))
    const file = join(dir, 'm.json')
    writeFileSync(file, JSON.stringify([{ name: 'selftest: while(true)', file: 'server/utils/loginBackoff.ts', find: 'export const LOGIN_IP_BACKOFF', repl: 'while (true) {}\nexport const LOGIN_IP_BACKOFF' }]))
    const scratch = join(dir, 'repo')
    const t0 = Date.now()
    const r = spawnSync('python3', ['scripts/mutation/check.py'], {
      cwd: root, encoding: 'utf8', timeout: 150_000, killSignal: 'SIGKILL',
      env: { ...process.env, MUTANTS_FILE: file, MUTATION_DIR: scratch, MUTATION_TIMEOUT: '12' },
    })
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /selftest: while\(true\) KILLED \(timeout\)/)
    assert.match(r.stdout, /SCORE 1\/1 \(killed by assertion 0, killed by timeout 1\)/)
    assert.ok(Date.now() - t0 < 120_000)
    sleepMs(300)
    const left = spawnSync('sh', ['-c', `for p in /proc/[0-9]*; do [ "$(readlink $p/cwd)" = "${scratch}" ] && echo $p; done`], { encoding: 'utf8' }).stdout.trim()
    assert.equal(left, '', 'process left in the scratch copy')
  })
})

describe('the runners are wired to the limit (guards against going back to unbounded spawns)', () => {
  const check = read('scripts/mutation/check.py')
  test('check.py uses run_limited with a per-mutant timeout, reports timeout kills separately and reaps leftovers', () => {
    assert.match(check, /run_limited\(/)
    assert.match(check, /MUTATION_TIMEOUT/)
    assert.match(check, /KILLED \(timeout\)/)
    assert.match(check, /kill_in_dir\(DST\)/)
    assert.doesNotMatch(check, /shell\s*=\s*True/)
    assert.doesNotMatch(check, /subprocess\.run\(\[\s*['"]node['"]/)
  })
  test('limited.py isolates the child (own session), nices it and kills the group', () => {
    const lim = read('scripts/mutation/limited.py')
    assert.match(lim, /start_new_session=True/)
    assert.match(lim, /'nice', '-n', '19'/)
    assert.match(lim, /os\.killpg\(pgid, signal\.SIGKILL\)/)
  })
  test('run-limited.sh uses setsid, nice 19, timeout -k and a group kill', () => {
    const sh = read('scripts/run-limited.sh')
    assert.match(sh, /setsid nice -n 19 timeout -k 5 -s KILL/)
    assert.match(sh, /kill -s KILL -- -\$pid/)
  })
})
