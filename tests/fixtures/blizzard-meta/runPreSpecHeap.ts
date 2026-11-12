/**
 * Child entry for the pre-spec heap probe. Run with:
 *   node --expose-gc --max-old-space-size=256 --import tsx tests/fixtures/blizzard-meta/runPreSpecHeap.ts
 *   META_PRE_SPEC_MODE=400k ... (403k unique players, still bounded by maxCandidates)
 */
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../../server/database/bootstrap'
import { resetBlizzardAccessTokenCache } from '../../../server/utils/blizzardAuth'
import { defaultMetaHeapMonitor } from '../../../server/utils/blizzardMetaHeap'
import { META_SYNC_DEFAULT_MAX_CANDIDATES, buildMetaSnapshot } from '../../../server/utils/blizzardMetaSync'
import { META_SYNC_CLI_DEFAULT_HEAP_MB } from '../../../server/utils/metaSyncCliHeap'
import {
  PRE_SPEC_400K_GROUPS,
  PRE_SPEC_400K_REALM_COUNT,
  PRE_SPEC_400K_UNIQUE,
  PRE_SPEC_DUNGEON_COUNT,
  PRE_SPEC_PERIOD_COUNT,
  PRE_SPEC_REALM_COUNT,
  createPreSpecHeapFetcher,
  expectedUniqueCandidates,
  fullLeaderboardJsonBytes,
} from './preSpecHeapFixture'

const CREDENTIALS = { id: 'id', secret: 'secret' }
const mode400k = process.env.META_PRE_SPEC_MODE === '400k'

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
const prod = defaultMetaHeapMonitor()

const fetcher = mode400k
  ? createPreSpecHeapFetcher({
      realmCount: PRE_SPEC_400K_REALM_COUNT,
      uniqueAcrossBoards: true,
      groupsForRealm: () => PRE_SPEC_400K_GROUPS,
    })
  : createPreSpecHeapFetcher()

let liveAfterGcBytes = 0
let heapBeforeClearGcBytes = 0
const { payload, preSpec, leaderboards } = await buildMetaSnapshot({
  fetcher,
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
    maxCandidates: META_SYNC_DEFAULT_MAX_CANDIDATES,
  },
  heap: {
    used: () => {
      const used = prod.used()
      if (used > peak) peak = used
      return used
    },
    limit: prod.limit,
    fraction: prod.fraction,
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
  mode: mode400k ? '400k' : 'eu',
  boardJsonBytes,
  expectedIncoming: mode400k ? PRE_SPEC_400K_UNIQUE : expectedUniqueCandidates(PRE_SPEC_REALM_COUNT),
  maxCandidates: META_SYNC_DEFAULT_MAX_CANDIDATES,
  realms: mode400k ? PRE_SPEC_400K_REALM_COUNT : PRE_SPEC_REALM_COUNT,
  dungeons: PRE_SPEC_DUNGEON_COUNT,
  periods: PRE_SPEC_PERIOD_COUNT,
  planned: preSpec?.planned ?? leaderboards.planned,
  ok: preSpec?.ok ?? leaderboards.ok,
  failed: preSpec?.failed ?? leaderboards.failed,
  candidates: preSpec?.candidates ?? payload.freshness.players,
  retained: preSpec?.retained ?? 0,
  incomingPlayers: preSpec?.incomingPlayers ?? payload.freshness.players,
  dropped: preSpec?.dropped ?? { ingest: 0, trim: 0, total: 0 },
  players: payload.freshness.players,
  keyLevelMin: preSpec?.keyLevelStats.min ?? payload.freshness.keyLevels?.min ?? null,
  keyLevelMax: preSpec?.keyLevelStats.max ?? payload.freshness.keyLevels?.max ?? null,
  baselineBytes: baseline,
  heapBeforeGcBytes: beforeGc,
  heapAfterGcBytes: afterGc,
  peakHeapBytes: peak,
  rssAfterGcBytes: rssAfterGc,
  heapLimitBytes: v8.heap_size_limit,
  guardLimitBytes: prod.limit(),
  cliHeapMb: META_SYNC_CLI_DEFAULT_HEAP_MB,
}

console.log(JSON.stringify(result))
