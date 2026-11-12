import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { resetBlizzardAccessTokenCache } from '../../server/utils/blizzardAuth'
import {
  META_HEAP_CHECK_EVERY_GROUPS,
  META_SYNC_DEFAULT_MAX_CANDIDATES,
  META_SYNC_DEFAULT_MAX_PER_SPEC,
  MetaCandidateTable,
  buildMetaSnapshot,
  mergeMetaSyncCaps,
} from '../../server/utils/blizzardMetaSync'
import {
  META_SYNC_CLI_DEFAULT_HEAP_MB,
  META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES,
  META_SYNC_CLI_PEAK_RSS_BUDGET_BYTES,
} from '../../server/utils/metaSyncCliHeap'
import {
  PRE_SPEC_400K_UNIQUE,
  PRE_SPEC_DUNGEON_COUNT,
  PRE_SPEC_PERIOD_COUNT,
  PRE_SPEC_REALM_COUNT,
  createPreSpecHeapFetcher,
} from '../fixtures/blizzard-meta/preSpecHeapFixture'

const CHILD = fileURLToPath(new URL('../fixtures/blizzard-meta/runPreSpecHeap.ts', import.meta.url))

type PreSpecMeasure = {
  mode: string
  boardJsonBytes: number
  expectedIncoming: number
  maxCandidates: number
  planned: number
  ok: number
  failed: number
  candidates: number
  retained: number
  incomingPlayers: number
  dropped: { ingest: number, trim: number, total: number }
  players: number
  keyLevelMin: number | null
  keyLevelMax: number | null
  baselineBytes: number
  heapBeforeGcBytes: number
  heapAfterGcBytes: number
  peakHeapBytes: number
  rssAfterGcBytes: number
  heapLimitBytes: number
  guardLimitBytes: number
}

function runProbe(env: NodeJS.ProcessEnv = {}): PreSpecMeasure {
  const result = spawnSync(
    process.execPath,
    ['--expose-gc', `--max-old-space-size=${META_SYNC_CLI_DEFAULT_HEAP_MB}`, '--import', 'tsx', CHILD],
    { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', ...env }, timeout: 170_000 },
  )
  if (result.status !== 0) {
    assert.fail(`pre-spec child exited ${result.status} signal=${result.signal}\nstdout:${result.stdout}\nstderr:${result.stderr}`)
  }
  const line = result.stdout.trim().split('\n').filter(Boolean).at(-1) || ''
  return JSON.parse(line) as PreSpecMeasure
}

function assertBounded(measured: PreSpecMeasure, incoming: number) {
  assert.equal(measured.failed, 0)
  assert.equal(measured.ok, measured.planned)
  assert.ok(incoming > META_SYNC_DEFAULT_MAX_PER_SPEC)
  assert.equal(measured.incomingPlayers, incoming)
  assert.equal(measured.players, incoming, 'freshness.players must be the pre-trim unique count')
  assert.ok(
    measured.candidates <= 40 * META_SYNC_DEFAULT_MAX_PER_SPEC,
    `kept ${measured.candidates} candidates, per-spec cap is ${META_SYNC_DEFAULT_MAX_PER_SPEC} (incoming ${incoming})`,
  )
  assert.ok(measured.candidates < incoming)
  assert.equal(measured.dropped.ingest, incoming - measured.candidates)
  assert.ok(measured.dropped.total >= measured.dropped.ingest)
  assert.ok(measured.retained <= 40 * 400 && measured.retained > 0)
  assert.ok(measured.keyLevelMin != null && measured.keyLevelMax != null && measured.keyLevelMax >= measured.keyLevelMin)
  assert.ok(
    measured.boardJsonBytes > 600_000 && measured.boardJsonBytes < 2_500_000,
    `500-group board JSON was ${measured.boardJsonBytes} bytes`,
  )
  assert.ok(
    measured.heapAfterGcBytes < META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES,
    `live heap after GC was ${(measured.heapAfterGcBytes / 1024 / 1024).toFixed(1)} MB`,
  )
  assert.ok(
    measured.peakHeapBytes < META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES,
    `peak ${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB exceeds the ${META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES / 1024 / 1024} MB budget`,
  )
  assert.ok(
    measured.peakHeapBytes < measured.guardLimitBytes * 0.70,
    `peak ${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB reached 70% of the ${(measured.guardLimitBytes / 1024 / 1024).toFixed(1)} MB guard ceiling`,
  )
  assert.ok(measured.rssAfterGcBytes < META_SYNC_CLI_PEAK_RSS_BUDGET_BYTES)
  console.log(
    `[meta-heap] pre-spec ${measured.mode} incoming=${incoming} kept=${measured.candidates} retained=${measured.retained} `
    + `beforeGc=${(measured.heapBeforeGcBytes / 1024 / 1024).toFixed(1)} MB `
    + `afterGc=${(measured.heapAfterGcBytes / 1024 / 1024).toFixed(1)} MB `
    + `peak=${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB `
    + `guard=${(measured.guardLimitBytes / 1024 / 1024).toFixed(1)} MB `
    + `rss=${(measured.rssAfterGcBytes / 1024 / 1024).toFixed(1)} MB`,
  )
}

describe('meta pre-spec heap (CLI cap, production guard)', () => {
  it('evicts the lowest-scoring players when the hard cap is exceeded', () => {
    const table = new MetaCandidateTable(4)
    for (let i = 0; i < 20; i++) table.add('realm', `p${i}`, 63, i)
    table.evictTo(4)
    assert.equal(table.size, 4)
    const names = [...table.players()].map(p => p.name).sort()
    assert.deepEqual(names, ['p16', 'p17', 'p18', 'p19'])
    assert.equal(table.counters.uniquePlayers, 20)
    assert.equal(table.dropped, 16)
  })

  it('keeps a 1-run high key over a many-run low key, and lets a re-entrant beat the cutoff', () => {
    const table = new MetaCandidateTable(2)
    table.add('r', 'grinder-a', 63, 10)
    table.add('r', 'grinder-a', 63, 11)
    table.add('r', 'grinder-a', 63, 12)
    table.add('r', 'grinder-b', 63, 9)
    table.add('r', 'grinder-b', 63, 9)
    table.add('r', 'oneshot', 63, 30)
    const kept = [...table.players()].map(p => p.name).sort()
    assert.ok(kept.includes('oneshot'), `1-run +30 should be kept, got ${kept.join(',')}`)
    assert.ok(kept.includes('grinder-a'))
    assert.ok(!kept.includes('grinder-b'))
    table.add('r', 'late', 63, 5)
    assert.ok(![...table.players()].map(p => p.name).includes('late'))
    table.add('r', 'late', 63, 40)
    const after = [...table.players()].map(p => p.name).sort()
    assert.ok(after.includes('late'), `re-entrant +40 should return, got ${after.join(',')}`)
    assert.equal(table.counters.uniquePlayers, 4)
  })

  it('per-spec top-N by best matches an uncapped table (quality ~1.0)', () => {
    const capPerSpec = 20
    const topN = 10
    const specs = [62, 63, 64, 70, 71]
    const uncapped = new MetaCandidateTable(100_000)
    const capped = new MetaCandidateTable(capPerSpec)
    let incoming = 0
    for (const specId of specs) {
      for (let rank = 0; rank < 200; rank++) {
        incoming += 1
        const name = `s${specId}r${rank}`
        const best = Math.max(2, 40 - Math.floor(Math.log2(rank + 1) * 6) - (rank % 3))
        const runs = rank % 7 === 0 ? 1 : 2 + (rank % 12)
        for (let r = 0; r < runs; r++) {
          uncapped.add('r', name, specId, best - Math.min(r, 2))
          capped.add('r', name, specId, best - Math.min(r, 2))
        }
      }
    }
    const left = uncapped.topBySpec(topN)
    const right = capped.topBySpec(topN)
    let matched = 0
    let total = 0
    for (const specId of specs) {
      const a = (left.get(specId) ?? []).map(p => `${p.name}:${p.best}`)
      const b = (right.get(specId) ?? []).map(p => `${p.name}:${p.best}`)
      assert.deepEqual(b, a, `spec ${specId} top-${topN} diverged`)
      matched += a.length
      total += a.length
    }
    const overlap = total === 0 ? 0 : matched / total
    assert.equal(overlap, 1)
    assert.ok(capped.dropped > 0)
    assert.equal(capped.counters.uniquePlayers, incoming)
    assert.equal(uncapped.counters.uniquePlayers, incoming)
    console.log(`[meta-heap] quality overlap=${overlap.toFixed(3)} incoming=${incoming} dropped=${capped.dropped}`)
  })

  it('keeps an EU-scale fixture bounded under the CLI heap cap', { timeout: 180_000 }, () => {
    const measured = runProbe()
    const jobs = PRE_SPEC_REALM_COUNT * PRE_SPEC_DUNGEON_COUNT * PRE_SPEC_PERIOD_COUNT
    assert.equal(measured.planned, jobs)
    assertBounded(measured, measured.expectedIncoming)
  })

  it('keeps 400k unique characters bounded and does not trip the guard', { timeout: 180_000 }, () => {
    const measured = runProbe({ META_PRE_SPEC_MODE: '400k' })
    assert.equal(measured.mode, '400k')
    assert.equal(measured.expectedIncoming, PRE_SPEC_400K_UNIQUE)
    assertBounded(measured, PRE_SPEC_400K_UNIQUE)
  })


  it('does not overwrite a legacy maxCandidates total with the per-spec cap', () => {
    const caps = mergeMetaSyncCaps({ maxCandidates: 32_000, maxAttemptsPerSpec: 400 })
    assert.equal(caps.maxCandidates, 32_000)
    assert.equal(caps.maxCandidatesPerSpec, META_SYNC_DEFAULT_MAX_PER_SPEC)
    const onlyPerSpec = mergeMetaSyncCaps({ maxCandidatesPerSpec: 50, maxAttemptsPerSpec: 40, samplePerSpec: 20 })
    assert.equal(onlyPerSpec.maxCandidatesPerSpec, 50)
    assert.equal(onlyPerSpec.maxCandidates, META_SYNC_DEFAULT_MAX_CANDIDATES)
  })

  it('warns when ingest drops candidates under the per-spec cap', { timeout: 60_000 }, async () => {
    resetBlizzardAccessTokenCache()
    const warnings: string[] = []
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    const { preSpec } = await buildMetaSnapshot({
      fetcher: createPreSpecHeapFetcher({
        realmCount: 1,
        uniqueAcrossBoards: true,
        groupsForRealm: () => 40,
      }),
      credentials: { id: 'id', secret: 'secret' },
      sqlite,
      caps: {
        concurrency: 4,
        periods: PRE_SPEC_PERIOD_COUNT,
        maxRealms: 0,
        maxRps: 50,
        samplePerSpec: 5,
        maxAttemptsPerSpec: 10,
        maxCandidatesPerSpec: 20,
        maxConcurrentSpecs: 1,
      },
      heap: { used: () => 1, limit: () => 1024 * 1024 * 1024, fraction: 0.70 },
      sleep: async () => {},
      stopAfter: 'pre-spec',
      warn: (message) => { warnings.push(message) },
    })
    sqlite.close()
    assert.ok(preSpec && preSpec.dropped.ingest > 0, 'fixture must exceed the per-spec cap')
    const line = warnings.find(message => message.includes('Meta ingest dropped'))
    assert.ok(line, `expected an ingest-dropped warning, got ${JSON.stringify(warnings)}`)
    assert.match(line, new RegExp(`Meta ingest dropped ${preSpec.dropped.ingest} candidates`))
    assert.match(line, /per-spec top-20/)
  })

  it('checks the heap guard inside a board, not only between boards', { timeout: 60_000 }, async () => {
    resetBlizzardAccessTokenCache()
    const groups = META_HEAP_CHECK_EVERY_GROUPS * 3
    const realms = 1
    const dungeons = PRE_SPEC_DUNGEON_COUNT
    const periods = PRE_SPEC_PERIOD_COUNT
    const boards = realms * dungeons * periods
    let usedCalls = 0
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    await buildMetaSnapshot({
      fetcher: createPreSpecHeapFetcher({
        realmCount: realms,
        groupsForRealm: () => groups,
      }),
      credentials: { id: 'id', secret: 'secret' },
      sqlite,
      caps: { concurrency: 4, periods, maxRealms: 0, maxRps: 50, maxAttemptsPerSpec: 400, maxConcurrentSpecs: 1 },
      heap: {
        used: () => {
          usedCalls += 1
          return 1
        },
        limit: () => 1024 * 1024 * 1024,
        fraction: 0.70,
      },
      sleep: async () => {},
      stopAfter: 'pre-spec',
    })
    sqlite.close()
    const inBoard = boards * Math.floor(groups / META_HEAP_CHECK_EVERY_GROUPS)
    assert.ok(
      usedCalls >= boards + inBoard,
      `heap used() was called ${usedCalls} times; expected at least ${boards} board starts plus ${inBoard} in-board checks`,
    )
  })
})
