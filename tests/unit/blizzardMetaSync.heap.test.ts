import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { resetBlizzardAccessTokenCache } from '../../server/utils/blizzardAuth'
import { assertMetaHeapSafe, MetaHeapGuardError, type MetaHeapMonitor } from '../../server/utils/blizzardMetaHeap'
import { resetBlizzardMetaLock } from '../../server/utils/blizzardMetaLock'
import { buildMetaSnapshot, runScheduledBlizzardMetaSync } from '../../server/utils/blizzardMetaSync'
import { readCurrentMetaSnapshot, writeMetaSnapshot } from '../../server/utils/blizzardMetaStore'
import { parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_REGION, META_SNAPSHOT_TTL_MS } from '../../utils/metaTypes'
import {
  HEAP_PAD_BYTES,
  HEAP_SAMPLES_PER_SPEC,
  HEAP_SPEC_COUNT,
  HEAP_SPECS,
  createHeapFixtureFetcher,
  heapCharacterKey,
} from '../fixtures/blizzard-meta/heapFixture'
import { fixtureFetcher } from '../fixtures/blizzard-meta/fetcher'

const HEAP_GROWTH_BUDGET = 96 * 1024 * 1024
const CREDENTIALS = { id: 'id', secret: 'secret' }

function openStore() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}

function snapshotPayload() {
  const parsed = parseMetaSnapshotPayload(readFileSync(new URL('../fixtures/blizzard-meta/snapshot.json', import.meta.url), 'utf8'))
  assert.ok(parsed)
  return parsed
}

function maybeGc() {
  if (typeof globalThis.gc === 'function') globalThis.gc()
}

function measurePeak(run: (record: () => void) => Promise<void> | void): Promise<{ baseline: number, peak: number, growth: number }> {
  maybeGc()
  const baseline = process.memoryUsage().heapUsed
  let peak = baseline
  const record = () => {
    const used = process.memoryUsage().heapUsed
    if (used > peak) peak = used
  }
  return Promise.resolve(run(record)).then(() => {
    record()
    return { baseline, peak, growth: peak - baseline }
  })
}

function recordingHeap(record: () => void, overrides: Partial<MetaHeapMonitor> = {}): MetaHeapMonitor {
  return {
    used: () => {
      record()
      return overrides.used ? overrides.used() : process.memoryUsage().heapUsed
    },
    limit: overrides.limit ?? (() => 1024 * 1024 * 1024),
    fraction: overrides.fraction ?? 0.85,
  }
}

/** Old implementation shape: retain every raw profile/talent/gear body. */
async function collectRawProfilesLikeLegacy(fetcher: ReturnType<typeof createHeapFixtureFetcher>, record: () => void) {
  const retained: unknown[] = []
  const token = await fetcher({ method: 'POST', url: 'https://oauth.battle.net/token', headers: {} })
  assert.equal(token.status, 200)
  for (const spec of HEAP_SPECS) {
    for (let index = 0; index < HEAP_SAMPLES_PER_SPEC; index++) {
      const [realm, name] = heapCharacterKey(spec.specId, index).split('/')
      const base = `https://eu.api.blizzard.com/profile/wow/character/${realm}/${name}`
      const character = await fetcher({ method: 'GET', url: `${base}?namespace=profile-eu`, headers: {} })
      const specs = await fetcher({ method: 'GET', url: `${base}/specializations?namespace=profile-eu`, headers: {} })
      const equipment = await fetcher({ method: 'GET', url: `${base}/equipment?namespace=profile-eu`, headers: {} })
      retained.push({ specsBody: specs.body, equipmentBody: equipment.body, characterBody: character.body })
      if (retained.length % 50 === 0) record()
    }
  }
  record()
  return retained
}

describe('blizzard meta sync heap budget', () => {
  afterEach(() => {
    resetBlizzardAccessTokenCache()
    resetBlizzardMetaLock()
  })

  it('keeps 40 specs × 200 padded samples under the 96 MB heap-growth budget', { timeout: 120_000 }, async () => {
    const sqlite = openStore()
    const fetcher = createHeapFixtureFetcher({ uniquePad: true })
    const measured = await measurePeak(async (record) => {
      const { payload, failures } = await buildMetaSnapshot({
        fetcher,
        credentials: CREDENTIALS,
        sqlite,
        caps: { samplePerSpec: HEAP_SAMPLES_PER_SPEC, maxAttemptsPerSpec: HEAP_SAMPLES_PER_SPEC, maxRealms: 1, periods: 1, concurrency: 4, maxConcurrentSpecs: 1 },
        heap: recordingHeap(record),
        sleep: async () => {},
      })
      record()
      assert.equal(failures.exceptions, 0)
      const total = payload.classes.reduce((sum, cls) => sum + cls.specs.reduce((inner, spec) => inner + spec.n, 0), 0)
      assert.equal(total, HEAP_SPEC_COUNT * HEAP_SAMPLES_PER_SPEC)
      const leftoverRun = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_run_staging').get() as { n: number }
      const leftoverSpec = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }
      assert.equal(leftoverRun.n, 0, 'success path must leave meta_sync_run_staging empty')
      assert.equal(leftoverSpec.n, 0, 'success path must leave meta_sync_spec_staging empty')
    })
    assert.ok(
      measured.growth < HEAP_GROWTH_BUDGET,
      `lean path grew ${(measured.growth / (1024 * 1024)).toFixed(1)} MB, budget is 96 MB (baseline ${(measured.baseline / (1024 * 1024)).toFixed(1)} MB, peak ${(measured.peak / (1024 * 1024)).toFixed(1)} MB)`,
    )
    console.log(`[meta-heap] lean 40×200 growth=${(measured.growth / (1024 * 1024)).toFixed(1)} MB peak=${(measured.peak / (1024 * 1024)).toFixed(1)} MB pad=${HEAP_PAD_BYTES} B`)
  })

  it('goes red against the old retain-all-raw-bodies approach', { timeout: 120_000 }, async () => {
    const fetcher = createHeapFixtureFetcher({ uniquePad: true })
    const measured = await measurePeak(async (record) => {
      const retained = await collectRawProfilesLikeLegacy(fetcher, record)
      assert.equal(retained.length, HEAP_SPEC_COUNT * HEAP_SAMPLES_PER_SPEC)
    })
    assert.ok(
      measured.growth >= HEAP_GROWTH_BUDGET,
      `legacy retain path only grew ${(measured.growth / (1024 * 1024)).toFixed(1)} MB; the budget would not have caught the old implementation`,
    )
    console.log(`[meta-heap] legacy retain 40×200 growth=${(measured.growth / (1024 * 1024)).toFixed(1)} MB peak=${(measured.peak / (1024 * 1024)).toFixed(1)} MB`)
  })

  it('aborts cleanly on a simulated heap breach and keeps the last-good snapshot', async () => {
    const sqlite = openStore()
    const now = 1_700_000_000_000
    const previous = writeMetaSnapshot(sqlite, snapshotPayload(), now, META_SNAPSHOT_TTL_MS)
    let checks = 0
    const heap: MetaHeapMonitor = {
      used: () => {
        checks += 1
        return checks >= 2 ? 900 : 1
      },
      limit: () => 1000,
      fraction: 0.85,
    }
    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: {
        metaNightly: 'on',
        blizzardClientId: 'id',
        blizzardClientSecret: 'secret',
      },
      fetcher: fixtureFetcher(),
      now,
      caps: { maxRealms: 2, periods: 1, concurrency: 2, maxConcurrentSpecs: 1 },
      heap,
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })
    assert.equal(result.status, 'error')
    assert.ok(result.reason?.includes('heap'))
    assert.match(result.reason || '', /85%/)
    assert.equal(result.snapshotId, null)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now)
    assert.ok(current)
    assert.equal(current.snapshotId, previous.snapshotId)
    assert.equal(current.payload.classes[0]?.slug, 'mage')
    const leftoverSpec = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }
    const leftoverRun = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_run_staging').get() as { n: number }
    assert.equal(leftoverSpec.n, 0)
    assert.equal(leftoverRun.n, 0)
  })

  it('purges leftover staging rows from a previous crash at the start of a run', async () => {
    const sqlite = openStore()
    const now = Date.now()
    sqlite.prepare('INSERT INTO meta_sync_run_staging (run_token, payload, created_at) VALUES (?, ?, ?)').run('old-crash', '{}', 1)
    sqlite.prepare('INSERT INTO meta_sync_spec_staging (run_token, spec_id, class_name, spec_name, payload) VALUES (?, ?, ?, ?, ?)').run('old-crash', 62, 'Mage', 'Fire', '{}')
    writeMetaSnapshot(sqlite, snapshotPayload(), now, META_SNAPSHOT_TTL_MS)
    let checks = 0
    const heap: MetaHeapMonitor = {
      used: () => {
        checks += 1
        return checks >= 1 ? 900 : 1
      },
      limit: () => 1000,
      fraction: 0.85,
    }
    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: {
        metaNightly: 'on',
        blizzardClientId: 'id',
        blizzardClientSecret: 'secret',
      },
      fetcher: fixtureFetcher(),
      now,
      caps: { maxRealms: 2, periods: 1, concurrency: 2, maxConcurrentSpecs: 1 },
      heap,
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })
    assert.equal(result.status, 'error')
    const leftoverSpec = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }
    const leftoverRun = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_run_staging').get() as { n: number }
    const leftoverOld = sqlite.prepare("SELECT COUNT(*) AS n FROM meta_sync_spec_staging WHERE run_token = 'old-crash'").get() as { n: number }
    assert.equal(leftoverSpec.n, 0)
    assert.equal(leftoverRun.n, 0)
    assert.equal(leftoverOld.n, 0)
  })

  it('with maxConcurrentSpecs=4 writes no staging rows after abort', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const now = Date.now()
    writeMetaSnapshot(sqlite, snapshotPayload(), now, META_SNAPSHOT_TTL_MS)
    const abortController = new AbortController()
    let releaseParked: () => void = () => {}
    const parked = new Promise<void>((resolve) => { releaseParked = resolve })
    abortController.signal.addEventListener('abort', () => { releaseParked() })

    const firstSpecId = HEAP_SPECS[0]!.specId
    const firstNamePrefix = `/s${firstSpecId}p`
    let fetchesAfterAbort = 0
    const baseFetcher = createHeapFixtureFetcher()
    const fetcher = async (request: Parameters<typeof baseFetcher>[0]) => {
      if (abortController.signal.aborted) fetchesAfterAbort += 1
      const url = request.url
      if (url.includes('/profile/wow/character/') && !url.includes(firstNamePrefix)) {
        if (!abortController.signal.aborted) await parked
      }
      return baseFetcher(request)
    }

    let writesBeforeAbort = 0
    let writesAfterAbort = 0
    const originalPrepare = sqlite.prepare.bind(sqlite)
    sqlite.prepare = ((sql: string) => {
      const stmt = originalPrepare(sql)
      if (typeof sql === 'string' && /INSERT INTO meta_sync_(spec|run)_staging/.test(sql)) {
        const originalRun = stmt.run.bind(stmt)
        Object.defineProperty(stmt, 'run', {
          configurable: true,
          value: (...args: unknown[]) => {
            if (abortController.signal.aborted) writesAfterAbort += 1
            else writesBeforeAbort += 1
            return originalRun(...args)
          },
        })
      }
      return stmt
    }) as typeof sqlite.prepare

    let heapTripped = false
    const heap: MetaHeapMonitor = {
      used: () => {
        const n = (originalPrepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }).n
        if (!heapTripped && n >= 1) {
          heapTripped = true
          return 900
        }
        return 1
      },
      limit: () => 1000,
      fraction: 0.85,
    }

    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: {
        metaNightly: 'on',
        blizzardClientId: 'id',
        blizzardClientSecret: 'secret',
      },
      fetcher,
      now,
      caps: {
        maxRealms: 1,
        periods: 1,
        concurrency: 4,
        maxConcurrentSpecs: 4,
        samplePerSpec: 2,
        maxAttemptsPerSpec: 2,
      },
      heap,
      abortController,
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })

    if (!abortController.signal.aborted) releaseParked()
    assert.equal(result.status, 'error')
    assert.ok(result.reason?.includes('heap'))
    assert.ok(writesBeforeAbort >= 1, `expected at least one staging write before abort, got ${writesBeforeAbort}`)
    assert.equal(writesAfterAbort, 0, `staging write happened after abort (${writesAfterAbort})`)
    assert.equal(fetchesAfterAbort, 0, `fetcher ran after abort (${fetchesAfterAbort})`)
    const leftoverSpec = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }
    const leftoverRun = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_run_staging').get() as { n: number }
    assert.equal(leftoverSpec.n, 0)
    assert.equal(leftoverRun.n, 0)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const laterSpec = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }
    const laterRun = sqlite.prepare('SELECT COUNT(*) AS n FROM meta_sync_run_staging').get() as { n: number }
    assert.equal(laterSpec.n, leftoverSpec.n)
    assert.equal(laterRun.n, leftoverRun.n)
    assert.equal(laterSpec.n, 0)
    assert.equal(laterRun.n, 0)
  })

  it('does not promote a partial snapshot when abortController is aborted mid spec-phase', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const now = Date.now()
    const previous = writeMetaSnapshot(sqlite, snapshotPayload(), now, META_SNAPSHOT_TTL_MS)
    const abortController = new AbortController()
    const originalPrepare = sqlite.prepare.bind(sqlite)
    const baseFetcher = createHeapFixtureFetcher()
    const fetcher = async (request: Parameters<typeof baseFetcher>[0]) => {
      const response = await baseFetcher(request)
      if (
        request.url.includes('/profile/wow/character/')
        && !abortController.signal.aborted
        && (originalPrepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number }).n >= 1
      ) {
        abortController.abort()
      }
      return response
    }

    let thrown: unknown
    let result: Awaited<ReturnType<typeof runScheduledBlizzardMetaSync>> | undefined
    try {
      result = await runScheduledBlizzardMetaSync({
        sqlite,
        config: {
          metaNightly: 'on',
          blizzardClientId: 'id',
          blizzardClientSecret: 'secret',
        },
        fetcher,
        now,
        caps: {
          maxRealms: 1,
          periods: 1,
          concurrency: 4,
          maxConcurrentSpecs: 4,
          samplePerSpec: 2,
          maxAttemptsPerSpec: 2,
        },
        abortController,
        kumaPush: async () => 'pushed',
        purgeMeta: async () => 'purged',
        sleep: async () => {},
      })
    } catch (error) {
      thrown = error
    }

    if (thrown) {
      assert.match(String(thrown), /aborted/)
    } else {
      assert.equal(result?.status, 'error')
      assert.equal(result?.snapshotId, null)
      assert.notEqual(result?.status, 'ok')
    }
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now)
    assert.ok(current)
    assert.equal(current.snapshotId, previous.snapshotId)
  })
})

describe('meta heap guard', () => {
  it('throws a named error when usage reaches the configured fraction of the limit', () => {
    assert.throws(
      () => assertMetaHeapSafe({ used: () => 86 * 1024 * 1024, limit: () => 100 * 1024 * 1024, fraction: 0.85 }),
      (error: unknown) => error instanceof MetaHeapGuardError && /85%/.test((error as Error).message),
    )
  })
})
