import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { fixtureFetcher } from '../fixtures/blizzard-meta/fetcher'
import { initializeDatabase } from '../../server/database/bootstrap'
import { isBlizzardMetaLockHeld, tryAcquireBlizzardMetaLock } from '../../server/utils/blizzardMetaLock'
import { META_SYNC_CLI_START_HEAP_BUDGET_BYTES, META_SYNC_CLI_START_RSS_BUDGET_BYTES } from '../../server/utils/metaSyncCliHeap'
import { exitCodeForMetaSync, META_SYNC_CLI_EXIT, runMetaSyncCli, summarizeMetaSyncCli } from '../../server/utils/metaSyncCli'
import { buildMetaSyncCli } from '../../tools/build-meta-sync-cli.mjs'

function openStore() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}

const armed = {
  metaNightly: 'on',
  blizzardClientId: 'client-id-secret-value',
  blizzardClientSecret: 'client-secret-value',
}

describe('meta sync CLI summary and exit codes', () => {
  it('maps status values to distinct exit codes', () => {
    assert.equal(exitCodeForMetaSync('ok'), META_SYNC_CLI_EXIT.ok)
    assert.equal(exitCodeForMetaSync('error'), META_SYNC_CLI_EXIT.error)
    assert.equal(exitCodeForMetaSync('locked'), META_SYNC_CLI_EXIT.locked)
    assert.equal(exitCodeForMetaSync('partial'), META_SYNC_CLI_EXIT.partial)
    assert.equal(exitCodeForMetaSync('skipped'), META_SYNC_CLI_EXIT.skipped)
  })

  it('redacts secrets from the printed reason', () => {
    const summary = summarizeMetaSyncCli({
      result: { status: 'error', reason: 'token client-secret-value leaked', http429: 0, specsWithData: 0, durationMs: 12 },
      durationMs: 12,
      peakRssBytes: 1,
      peakHeapUsedBytes: 1,
      secrets: ['client-secret-value'],
    })
    assert.doesNotMatch(JSON.stringify(summary), /client-secret-value/)
    assert.match(summary.reason || '', /\[redacted\]/)
  })

  it('runs the same scheduled path, returns ok and a peak-memory summary', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    let rss = 10
    let heap = 5
    const { summary, exitCode } = await runMetaSyncCli({
      sqlite,
      config: armed,
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
      force: true,
      sleep: async () => {},
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      memory: () => {
        rss += 3
        heap += 2
        return { rss, heapUsed: heap }
      },
    })
    assert.equal(exitCode, 0)
    assert.equal(summary.status, 'ok')
    assert.ok(summary.specsWithData > 0)
    assert.equal(summary.http429, 0)
    assert.ok(summary.durationMs >= 0)
    assert.ok(summary.peakRssBytes >= 13)
    assert.ok(summary.peakHeapUsedBytes >= 7)
    sqlite.close()
  })

  it('exits non-zero with a locked summary when the SQLite lock is already held', async () => {
    const sqlite = openStore()
    const now = 1_700_000_000_000
    assert.equal(tryAcquireBlizzardMetaLock(sqlite, now).ok, true)
    const { summary, exitCode } = await runMetaSyncCli({
      sqlite,
      config: armed,
      fetcher: fixtureFetcher(),
      now,
      force: true,
      sleep: async () => {},
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
    })
    assert.equal(exitCode, META_SYNC_CLI_EXIT.locked)
    assert.equal(summary.status, 'locked')
    assert.match(summary.reason || '', /already running/i)
    sqlite.close()
  })

  it('skips without credentials even when force is set, and still runs when the nightly flag is off', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const skipped = await runMetaSyncCli({
      sqlite,
      config: { metaNightly: 'off' },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
      force: true,
      sleep: async () => {},
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
    })
    assert.equal(skipped.exitCode, META_SYNC_CLI_EXIT.skipped)
    assert.equal(skipped.summary.status, 'skipped')
    assert.match(skipped.summary.reason || '', /NUXT_BLIZZARD_CLIENT_ID/)

    const forced = await runMetaSyncCli({
      sqlite,
      config: { ...armed, metaNightly: 'off' },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
      force: true,
      sleep: async () => {},
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
    })
    assert.equal(forced.exitCode, 0)
    assert.equal(forced.summary.status, 'ok')
    sqlite.close()
  })
})

describe('meta sync CLI build', () => {
  const outDir = join(process.cwd(), 'node_modules', '.cache', 'meta-sync-cli-test')
  after(() => rmSync(outDir, { recursive: true, force: true }))

  it('emits a standalone .mjs that does not inline secrets or better-sqlite3', { timeout: 30_000 }, async () => {
    // Emit next to the repo node_modules so the external better-sqlite3 import resolves.
    const outFile = join(outDir, 'meta-sync-cli.mjs')
    const jobFile = join(outDir, 'meta-sync-job.mjs')
    mkdirSync(outDir, { recursive: true })
    const built = await buildMetaSyncCli({ repoRoot: process.cwd(), outFile, jobFile, logLevel: 'silent' })
    assert.equal(built, outFile)
    const wrapper = readFileSync(outFile, 'utf8')
    assert.match(wrapper, /meta-sync-job\.mjs/)
    assert.match(wrapper, /max-old-space-size/)
    const source = readFileSync(jobFile, 'utf8')
    assert.match(source, /better-sqlite3/)
    assert.ok(source.includes('import') && source.includes('better-sqlite3'), 'native addon must stay an external import')
    assert.match(source, /already running/)
    assert.doesNotMatch(source, /NUXT_BLIZZARD_CLIENT_SECRET=/)

    const cwd = mkdtempSync(join(tmpdir(), 'meta-sync-cli-run-'))
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: 'production',
      // Live website cap; the wrapper must strip this and apply the CLI heap.
      NODE_OPTIONS: '--enable-source-maps --max-old-space-size=640',
    }
    delete env.NUXT_BLIZZARD_CLIENT_ID
    delete env.NUXT_BLIZZARD_CLIENT_SECRET
    delete env.NUXT_META_NIGHTLY
    delete env.NUXT_META_CLI_HEAP_MB
    delete env.META_SYNC_CLI_HEAP_APPLIED
    const result = spawnSync(process.execPath, [outFile], { cwd, env, encoding: 'utf8' })
    assert.equal(result.status, 4, `stderr=${result.stderr}\nstdout=${result.stdout}`)
    const line = (result.stdout || '').trim().split('\n').at(-1) || ''
    const summary = JSON.parse(line)
    assert.equal(summary.status, 'skipped')
    assert.match(String(summary.reason || ''), /NUXT_BLIZZARD_CLIENT_ID/)
    assert.doesNotMatch(result.stdout + result.stderr, /Dynamic require/)
    assert.ok(summary.peakRssBytes < META_SYNC_CLI_START_RSS_BUDGET_BYTES, `start RSS ${summary.peakRssBytes} exceeds ${META_SYNC_CLI_START_RSS_BUDGET_BYTES}`)
    assert.ok(summary.peakHeapUsedBytes < META_SYNC_CLI_START_HEAP_BUDGET_BYTES, `start heap ${summary.peakHeapUsedBytes} exceeds ${META_SYNC_CLI_START_HEAP_BUDGET_BYTES}`)
    // ~256 MB cap is well under the inherited 640 / live 664 MB limit.
    assert.ok(summary.heapLimitBytes < 400 * 1024 * 1024, `heap limit ${summary.heapLimitBytes} still looks like the website 640 MB cap`)
    assert.ok(summary.heapLimitBytes > 200 * 1024 * 1024)
    assert.match(result.stderr, /\[meta-sync-cli\] process rss=/)
    rmSync(cwd, { recursive: true, force: true })
  })
})

describe('meta sync CLI signals', () => {
  const dir = mkdtempSync(join(tmpdir(), 'meta-sync-cli-signal-'))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it('aborts on SIGTERM, releases the SQLite lock, and exits non-zero', { timeout: 20_000 }, async () => {
    const dbPath = join(dir, 'signal.db')
    const readyFile = join(dir, 'ready')
    const sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('busy_timeout = 5000')
    initializeDatabase(sqlite)

    const childPath = join(dirname(fileURLToPath(import.meta.url)), 'helpers', 'metaSyncCliSignalChild.ts')
    const child = spawn(process.execPath, ['--import', 'tsx', childPath, dbPath, readyFile], {
      cwd: join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.stderr.on('data', (chunk: string) => { stderr += chunk })

    const started = Date.now()
    while (!existsSync(readyFile)) {
      if (Date.now() - started > 10_000) {
        child.kill('SIGKILL')
        sqlite.close()
        throw new Error(`child never became ready\nstdout=${stdout}\nstderr=${stderr}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    assert.equal(readFileSync(readyFile, 'utf8').includes('ready'), true)
    assert.equal(isBlizzardMetaLockHeld(sqlite), true)

    const finished = new Promise<{ status: number | null }>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error(`child did not exit after SIGTERM\nstdout=${stdout}\nstderr=${stderr}`))
      }, 8_000)
      child.on('close', (status) => {
        clearTimeout(timer)
        resolve({ status })
      })
    })
    const sent = child.kill('SIGTERM')
    assert.equal(sent, true, `kill(SIGTERM) returned false (child already exited)\nstdout=${stdout}\nstderr=${stderr}`)
    const { status } = await finished
    assert.notEqual(status, 0, `expected non-zero exit, got ${status}\nstdout=${stdout}\nstderr=${stderr}`)
    assert.equal(isBlizzardMetaLockHeld(sqlite), false, `lock still held after SIGTERM\nstdout=${stdout}\nstderr=${stderr}`)
    sqlite.close()
  })
})
