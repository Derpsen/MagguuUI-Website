import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { resetBlizzardAccessTokenCache } from '../../server/utils/blizzardAuth'
import {
  metaSnapshotCoverage,
  runScheduledBlizzardMetaSync,
  shouldKeepLastGoodMetaSnapshot,
  type MetaSyncCaps,
} from '../../server/utils/blizzardMetaSync'
import { readCurrentMetaSnapshot, writeMetaSnapshot } from '../../server/utils/blizzardMetaStore'
import { parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_REGION, META_SNAPSHOT_TTL_MS, type MetaSnapshotPayload } from '../../utils/metaTypes'
import { createHeapFixtureFetcher } from '../fixtures/blizzard-meta/heapFixture'

const CREDENTIALS_CONFIG = {
  metaNightly: 'on',
  blizzardClientId: 'id',
  blizzardClientSecret: 'secret',
}

function openStore() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}

function snapshotPayload(): MetaSnapshotPayload {
  const parsed = parseMetaSnapshotPayload(readFileSync(new URL('../fixtures/blizzard-meta/snapshot.json', import.meta.url), 'utf8'))
  assert.ok(parsed)
  return parsed
}

function tightCaps(overrides: Partial<MetaSyncCaps> = {}): Partial<MetaSyncCaps> {
  return {
    maxRealms: 1,
    periods: 1,
    concurrency: 8,
    maxConcurrentSpecs: 1,
    samplePerSpec: 2,
    maxAttemptsPerSpec: 2,
    maxSpecs: 3,
    ...overrides,
  }
}

afterEach(() => {
  resetBlizzardAccessTokenCache()
})

describe('metaSnapshotCoverage / shouldKeepLastGoodMetaSnapshot', () => {
  it('keeps last-good when the incoming snapshot covers fewer specs', () => {
    const previous = snapshotPayload()
    const prev = metaSnapshotCoverage(previous)
    assert.ok(prev.specsWithData >= 2, 'fixture snapshot should cover more than one spec')
    const incoming: MetaSnapshotPayload = {
      ...previous,
      classes: previous.classes.slice(0, 1).map(cls => ({
        ...cls,
        specs: cls.specs.slice(0, 1).map(spec => ({ ...spec, n: Math.max(1, spec.n), profileCount: Math.max(1, spec.profileCount ?? spec.n) })),
      })),
    }
    assert.equal(shouldKeepLastGoodMetaSnapshot(previous, incoming), true)
    assert.equal(shouldKeepLastGoodMetaSnapshot(null, incoming), false)
    assert.equal(shouldKeepLastGoodMetaSnapshot(incoming, previous), false)
  })

  it('replaces last-good when the incoming snapshot covers more specs or the same specs with more profiles', () => {
    const full = snapshotPayload()
    const thin: MetaSnapshotPayload = {
      ...full,
      classes: full.classes.slice(0, 1).map(cls => ({
        ...cls,
        specs: cls.specs.slice(0, 1).map(spec => ({ ...spec, n: 1 })),
      })),
    }
    assert.equal(shouldKeepLastGoodMetaSnapshot(thin, full), false)
    const richerSame: MetaSnapshotPayload = {
      ...thin,
      classes: thin.classes.map(cls => ({
        ...cls,
        specs: cls.specs.map(spec => ({ ...spec, n: spec.n + 5, profileCount: (spec.profileCount ?? spec.n) + 5 })),
      })),
    }
    assert.equal(shouldKeepLastGoodMetaSnapshot(thin, richerSame), false)
  })
})

describe('deadline partial snapshot', () => {
  it('promotes a partial snapshot when the deadline hits after a finished spec and last-good is empty', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const now = Date.now()
    let t = now
    const deadline = now + 10_000_000
    const baseFetcher = createHeapFixtureFetcher()
    const originalPrepare = sqlite.prepare.bind(sqlite)
    let sawMidPromote = false
    const fetcher = async (request: Parameters<typeof baseFetcher>[0]) => {
      const staged = (originalPrepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number } | undefined)?.n ?? 0
      if (staged >= 1) {
        const current = readCurrentMetaSnapshot(sqlite, META_REGION, t)
        if (current) sawMidPromote = true
        t = deadline
      }
      return baseFetcher(request)
    }

    const purges: string[] = []
    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: CREDENTIALS_CONFIG,
      fetcher,
      now: () => t,
      deadline,
      caps: tightCaps(),
      kumaPush: async () => 'pushed',
      purgeMeta: async () => {
        purges.push('purged')
        return 'purged'
      },
      sleep: async () => {},
    })

    assert.equal(result.status, 'partial')
    assert.match(result.reason || '', /job deadline/)
    assert.match(result.reason || '', /published partial/)
    assert.ok(result.snapshotId != null)
    assert.ok((result.specsWithData ?? 0) >= 1)
    assert.equal(sawMidPromote, true)
    assert.ok(purges.length >= 1)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, t)
    assert.ok(current)
    assert.equal(current.snapshotId, result.snapshotId)
    assert.ok(metaSnapshotCoverage(current.payload).specsWithData >= 1)
  })

  it('keeps last-good when the deadline hits after a thinner partial', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const now = Date.now()
    const previous = writeMetaSnapshot(sqlite, snapshotPayload(), now, META_SNAPSHOT_TTL_MS)
    let t = now
    const deadline = now + 10_000_000
    const baseFetcher = createHeapFixtureFetcher()
    const originalPrepare = sqlite.prepare.bind(sqlite)
    let sawMidPromote = false
    const fetcher = async (request: Parameters<typeof baseFetcher>[0]) => {
      const staged = (originalPrepare('SELECT COUNT(*) AS n FROM meta_sync_spec_staging').get() as { n: number } | undefined)?.n ?? 0
      if (staged >= 1) {
        const current = readCurrentMetaSnapshot(sqlite, META_REGION, t)
        if (current && current.snapshotId !== previous.snapshotId) sawMidPromote = true
        t = deadline
      }
      return baseFetcher(request)
    }

    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: CREDENTIALS_CONFIG,
      fetcher,
      now: () => t,
      deadline,
      caps: tightCaps(),
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })

    assert.equal(result.status, 'partial')
    assert.match(result.reason || '', /job deadline/)
    assert.match(result.reason || '', /kept last-good/)
    assert.equal(result.snapshotId, previous.snapshotId)
    assert.equal(sawMidPromote, false)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, t)
    assert.ok(current)
    assert.equal(current.snapshotId, previous.snapshotId)
  })

  it('still errors when the deadline hits before any spec is staged', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    let t = 1_700_000_000_000
    const deadline = t + 180_000
    const baseFetcher = createHeapFixtureFetcher()
    const fetcher = async (request: Parameters<typeof baseFetcher>[0]) => {
      t += 60_000
      return baseFetcher(request)
    }

    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: CREDENTIALS_CONFIG,
      fetcher,
      now: () => t,
      deadline,
      caps: tightCaps(),
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })

    assert.equal(result.status, 'error')
    assert.match(result.reason || '', /job deadline/)
    assert.equal(result.snapshotId ?? null, null)
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, t), null)
  })

  it('stops profile sampling at samplePerSpec under intra-spec concurrency', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const now = Date.now()
    const result = await runScheduledBlizzardMetaSync({
      sqlite,
      config: CREDENTIALS_CONFIG,
      fetcher: createHeapFixtureFetcher(),
      now,
      caps: tightCaps({
        samplePerSpec: 5,
        maxAttemptsPerSpec: 40,
        concurrency: 16,
        maxSpecs: 1,
      }),
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })

    // One spec cannot pass the all-catalog policy; the snapshot may stay unpromoted,
    // but sampled.profiles on a built run is visible via n / specsWithData when mid-promoted.
    // Last-good is empty, so the mid-run promote leaves a current snapshot at 5 (+ slight overshoot).
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now)
    assert.ok(current, `expected a mid-run snapshot, status=${result.status} reason=${result.reason}`)
    const coverage = metaSnapshotCoverage(current.payload)
    assert.ok(coverage.profiles >= 5, `profiles=${coverage.profiles}`)
    assert.ok(coverage.profiles <= 5 + 16, `overshoot too large: profiles=${coverage.profiles}`)
    assert.equal(coverage.specsWithData, 1)
  })

  it('logs per-spec progress and periodic request rate', { timeout: 30_000 }, async () => {
    const sqlite = openStore()
    const messages: string[] = []
    await runScheduledBlizzardMetaSync({
      sqlite,
      config: CREDENTIALS_CONFIG,
      fetcher: createHeapFixtureFetcher(),
      now: Date.now(),
      caps: tightCaps({
        samplePerSpec: 20,
        maxAttemptsPerSpec: 20,
        concurrency: 8,
        maxSpecs: 1,
      }),
      warn: (message) => { messages.push(message) },
      kumaPush: async () => 'pushed',
      purgeMeta: async () => 'purged',
      sleep: async () => {},
    })
    assert.ok(messages.some(line => /\[blizzard:nightly\] spec \S+ start candidates=\d+/.test(line)), messages.join('\n'))
    assert.ok(messages.some(line => /\[blizzard:nightly\] spec \S+ done profiles=\d+ attempts=\d+ duration=\S+s rate=\S+ rps/.test(line)), messages.join('\n'))
    assert.ok(messages.some(line => /\[blizzard:nightly\] progress calls=\d+ .* rate=\S+ rps/.test(line)), messages.join('\n'))
  })
})
