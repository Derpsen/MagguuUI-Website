/**
 * Child entry for the pre-spec heap probe. Run with:
 *   node --expose-gc --max-old-space-size=256 --import tsx tests/fixtures/blizzard-meta/runPreSpecHeap.ts
 */
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../../server/database/bootstrap'
import { resetBlizzardAccessTokenCache } from '../../../server/utils/blizzardAuth'
import { buildMetaSnapshot } from '../../../server/utils/blizzardMetaSync'
import {
  PRE_SPEC_DUNGEON_COUNT,
  PRE_SPEC_PERIOD_COUNT,
  PRE_SPEC_REALM_COUNT,
  createPreSpecHeapFetcher,
  expectedUniqueCandidates,
  fullLeaderboardJsonBytes,
} from './preSpecHeapFixture'

const CREDENTIALS = { id: 'id', secret: 'secret' }

function gc() {
  if (typeof globalThis.gc !== 'function') {
    throw new Error('run with --expose-gc')
  }
  globalThis.gc()
}

function heapUsed() {
  return process.memoryUsage().heapUsed
}

const boardJsonBytes = fullLeaderboardJsonBytes()
resetBlizzardAccessTokenCache()
gc()
const baseline = heapUsed()
let peak = baseline
const sqlite = new Database(':memory:')
initializeDatabase(sqlite)

let liveAfterGcBytes = 0
let heapBeforeClearGcBytes = 0
const { payload, preSpec, leaderboards } = await buildMetaSnapshot({
  fetcher: createPreSpecHeapFetcher(),
  credentials: CREDENTIALS,
  sqlite,
  caps: {
    concurrency: 16,
    periods: PRE_SPEC_PERIOD_COUNT,
    maxRealms: 0,
    maxRps: 50,
    samplePerSpec: 200,
    maxAttemptsPerSpec: 400,
    maxConcurrentSpecs: 1,
  },
  heap: {
    used: () => {
      const used = heapUsed()
      if (used > peak) peak = used
      return used
    },
    // Do not trip early: production compares against V8 heap_size_limit (~352 MB
    // with a 256 cap). This probe must finish so we can compare live vs garbage.
    limit: () => 1024 * 1024 * 1024,
    fraction: 0.85,
  },
  sleep: async () => {},
  stopAfter: 'pre-spec',
  onAfterPreSpec: () => {
    heapBeforeClearGcBytes = heapUsed()
    if (heapBeforeClearGcBytes > peak) peak = heapBeforeClearGcBytes
    gc()
    gc()
    liveAfterGcBytes = heapUsed()
    if (liveAfterGcBytes > peak) peak = liveAfterGcBytes
  },
})

const beforeGc = heapBeforeClearGcBytes || heapUsed()
const afterGc = liveAfterGcBytes || heapUsed()
const rssAfterGc = process.memoryUsage().rss
const v8 = (await import('node:v8')).default.getHeapStatistics()

const result = {
  boardJsonBytes,
  expectedCandidates: expectedUniqueCandidates(PRE_SPEC_REALM_COUNT),
  realms: PRE_SPEC_REALM_COUNT,
  dungeons: PRE_SPEC_DUNGEON_COUNT,
  periods: PRE_SPEC_PERIOD_COUNT,
  planned: preSpec?.planned ?? leaderboards.planned,
  ok: preSpec?.ok ?? leaderboards.ok,
  failed: preSpec?.failed ?? leaderboards.failed,
  candidates: preSpec?.candidates ?? payload.freshness.players,
  retained: preSpec?.retained ?? 0,
  players: payload.freshness.players,
  baselineBytes: baseline,
  heapBeforeGcBytes: beforeGc,
  heapAfterGcBytes: afterGc,
  peakHeapBytes: peak,
  rssAfterGcBytes: rssAfterGc,
  heapLimitBytes: v8.heap_size_limit,
}

console.log(JSON.stringify(result))
