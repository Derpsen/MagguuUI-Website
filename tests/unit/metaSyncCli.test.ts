import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { fixtureFetcher } from '../fixtures/blizzard-meta/fetcher'
import { initializeDatabase } from '../../server/database/bootstrap'
import { tryAcquireBlizzardMetaLock } from '../../server/utils/blizzardMetaLock'
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
  const dir = mkdtempSync(join(tmpdir(), 'meta-sync-cli-build-'))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it('emits a standalone .mjs that does not inline secrets or better-sqlite3', { timeout: 30_000 }, async () => {
    const outFile = join(dir, 'meta-sync-cli.mjs')
    const built = await buildMetaSyncCli({ repoRoot: process.cwd(), outFile, logLevel: 'silent' })
    assert.equal(built, outFile)
    const source = readFileSync(outFile, 'utf8')
    assert.match(source, /better-sqlite3/)
    assert.ok(source.includes('import') && source.includes('better-sqlite3'), 'native addon must stay an external import')
    assert.match(source, /already running/)
    assert.doesNotMatch(source, /NUXT_BLIZZARD_CLIENT_SECRET=/)
  })
})
