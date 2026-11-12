/**
 * EU Mythic+ Meta snapshot from the official Blizzard Game Data and Profile
 * APIs. All HTTP goes through an injected fetcher (no network in tests).
 * Player names and realms are transient lookup keys only and never written.
 */

import {
  findMetaClass,
  lookupBlizzardSpec,
  toMetaSlug,
} from '~/utils/metaCatalog'
import { decodeLoadoutHeader } from '~/utils/metaLoadout'
import {
  META_CONCURRENCY,
  META_FOCUS,
  META_JOB_TIMEOUT_MS,
  META_MAX_RPS,
  META_PREVIOUS_PERIODS,
  META_REGION,
  type MetaSnapshotPayload,
  type MetaTalentLayout,
  type MetaTalentTreeState,
} from '~/utils/metaTypes'
import {
  blizzardRegionFromRuntimeConfig,
  metaNightlyFromRuntimeConfig,
  sampleCapsFromRuntimeConfig,
} from '~/utils/metaSchedule'
import {
  absorbProfile,
  applyItemIcons,
  applySpellIcons,
  attachSpecLayouts,
  buildClassSummaries,
  collectItemIds,
  collectSpellIds,
  deserializeProfileBucket,
  emptyKeyLevelStats,
  emptyProfileBucket,
  extractActiveLoadouts,
  extractMediaIcon,
  knownIdsFromTalentLayout,
  metaKeyLevelsFromStats,
  observeKeyLevel,
  parseTalentTreeLayout,
  playableClassName,
  serializeProfileBucket,
  type MetaKeyLevelStats,
  type ProfileBucket,
  type SpecPop,
} from './blizzardMetaAggregate'
import {
  BLIZZARD_TOKEN_URL,
  basicAuthHeader,
  blizzardCredentialsFromConfig,
  getBlizzardAccessToken,
  resetBlizzardAccessTokenCache,
  sanitizeBlizzardLog,
  type BlizzardCredentials,
} from './blizzardAuth'
import {
  blizzardRequest,
  createBlizzardHttpStats,
  createBlizzardTraffic,
  type BlizzardFetcher,
  type BlizzardHttpStats,
  type BlizzardTraffic,
} from './blizzardHttp'
import { withBlizzardMetaLock } from './blizzardMetaLock'
import {
  decideDeadlinePartialPublish,
  evaluateMetaRunPolicy,
  metaSnapshotCoverage,
  type MetaPartialOutcome,
} from './blizzardMetaPolicy'
import {
  clearExpiredMetaSyncStaging,
  clearMetaSyncStaging,
  deleteExpiredMetaSnapshots,
  promoteMetaSnapshot,
  readCurrentMetaSnapshot,
  readMetaSyncRunContext,
  readMetaSyncSpecAggregates,
  recordMetaRun,
  writeMetaSyncRunContext,
  writeMetaSyncSpecAggregate,
  writeStagedMetaSnapshot,
  type MetaRunStatus,
  type MetaSqlite,
} from './blizzardMetaStore'
import { purgeCloudflareMeta } from './cloudflarePurge'
import { kumaStatusForMetaRun, pushMetaKuma } from './metaKuma'
import {
  assertMetaHeapSafe,
  defaultMetaHeapMonitor,
  isMetaHeapGuardError,
  type MetaHeapMonitor,
} from './blizzardMetaHeap'
import Database from 'better-sqlite3'

export type MetaSyncCaps = {
  samplePerSpec: number
  maxAttemptsPerSpec: number
  maxRps: number
  concurrency: number
  maxRealms: number
  periods: number
  maxConcurrentSpecs: number
  /** Per-spec bound on players kept during ingest, ranked by best then runs. */
  maxCandidatesPerSpec: number
  /** When > 0, profile at most this many specs (tests and bounded repros). 0 = all. */
  maxSpecs: number
}

/** Keep at least 2× the final per-spec sample so multi-spec assignment does not starve a list. */
export const META_SYNC_DEFAULT_MAX_PER_SPEC = 800
/** Historical alias for 40 × 800. Eviction is per-spec; this is not a global cap. */
export const META_SYNC_DEFAULT_MAX_CANDIDATES = 40 * META_SYNC_DEFAULT_MAX_PER_SPEC

export const META_SYNC_DEFAULT_CAPS: MetaSyncCaps = {
  samplePerSpec: 200,
  maxAttemptsPerSpec: 400,
  maxRps: META_MAX_RPS,
  concurrency: META_CONCURRENCY,
  maxRealms: 0,
  periods: META_PREVIOUS_PERIODS + 1,
  maxConcurrentSpecs: 1,
  maxCandidatesPerSpec: META_SYNC_DEFAULT_MAX_PER_SPEC,
  maxSpecs: 0,
}

const API_ROOT = 'https://eu.api.blizzard.com'
const DYNAMIC = 'dynamic-eu'
const STATIC = 'static-eu'
const PROFILE = 'profile-eu'
const LOCALE = 'en_GB'

type SyncOptions = {
  fetcher: BlizzardFetcher
  credentials: BlizzardCredentials
  sleep?: (ms: number) => Promise<void>
  now?: number | (() => number)
  caps?: Partial<MetaSyncCaps>
  deadline?: number
  stats?: BlizzardHttpStats
  traffic?: BlizzardTraffic
  sqlite?: MetaSqlite
  heap?: MetaHeapMonitor
  runToken?: string
  abortController?: AbortController
  /** Tests only: stop after leaderboard ingest, spec index, and candidate trim. */
  stopAfter?: 'pre-spec'
  /** Tests only: called after pre-spec stats are ready, before the candidate table is dropped. */
  onAfterPreSpec?: (info: MetaPreSpecStats) => void
  /** After each finished spec, publish a growing snapshot when last-good is empty. */
  onPartialSnapshot?: (payload: MetaSnapshotPayload) => void
  warn?: (message: string) => void
}

type CharacterCandidate = {
  realm: string
  name: string
  specId: number
  className: string
  specName: string
  best: number
  runs: number
}

type ProfileFailures = {
  notFound: number
  other: number
  specMismatch: number
  noLoadout: number
  badLoadoutCode: number
  outdatedTree: number
  exceptions: number
  attempted: number
}

export type MetaSyncDroppedCounts = {
  ingest: number
  trim: number
  total: number
}

export type ScheduledMetaResult = {
  status: MetaRunStatus
  reason?: string
  snapshotId?: number | null
  http429?: number
  specsWithData?: number
  durationMs?: number
  dropped?: MetaSyncDroppedCounts
  /** Distinguishes a published deadline/policy partial from keeping last-good. Exit stays 3 for both. */
  partialOutcome?: MetaPartialOutcome
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function minMax(values: readonly number[]): { min: number, max: number } | null {
  if (!values.length) return null
  let min = values[0]!
  let max = values[0]!
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max }
}


function idFromHref(href: string): number | null {
  const match = href.match(/connected-realm\/(\d+)/i) || href.match(/\/(\d+)(?:\?|$)/)
  return match ? Number(match[1]) : null
}

function playerHash(realm: string, name: string): number {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  const s = `${realm}/${name}`
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  return (h1 >>> 0) + 4294967296 * (h2 >>> 16)
}

type IngestSpecScore = { specId: number, runs: number, best: number }

function betterScore(a: IngestSpecScore, b: IngestSpecScore): boolean {
  return a.runs > b.runs || (a.runs === b.runs && a.best > b.best)
}

/**
 * Streaming unique-player / key-level / per-spec population counters.
 * Updated on every observation, before any selection trim, and kept for
 * evicted players so snapshot stats are not the capped subset.
 */
export class MetaIngestCounters {
  private readonly index = new Map<number, number>()
  private specIds = new Int32Array(4096)
  private runs = new Uint16Array(4096)
  private bests = new Uint16Array(4096)
  private size = 0
  /** Extra specs for the minority of multi-spec players, keyed by row. */
  private readonly extra = new Map<number, IngestSpecScore[]>()

  get uniquePlayers() {
    return this.size
  }

  private grow() {
    const cap = this.specIds.length * 2
    const specIds = new Int32Array(cap)
    const runs = new Uint16Array(cap)
    const bests = new Uint16Array(cap)
    specIds.set(this.specIds)
    runs.set(this.runs)
    bests.set(this.bests)
    this.specIds = specIds
    this.runs = runs
    this.bests = bests
  }

  private scores(row: number): IngestSpecScore[] {
    const primary = { specId: this.specIds[row]!, runs: this.runs[row]!, best: this.bests[row]! }
    const more = this.extra.get(row)
    return more ? [primary, ...more] : [primary]
  }

  private assigned(row: number): IngestSpecScore {
    const scores = this.scores(row)
    let best = scores[0]!
    for (let i = 1; i < scores.length; i++) {
      if (betterScore(scores[i]!, best)) best = scores[i]!
    }
    return best
  }

  observe(realm: string, name: string, specId: number, level: number) {
    const hash = playerHash(realm, name)
    let row = this.index.get(hash)
    if (row == null) {
      if (this.size >= this.specIds.length) this.grow()
      row = this.size++
      this.index.set(hash, row)
      this.specIds[row] = specId
      this.runs[row] = 1
      this.bests[row] = Math.max(0, level)
      return
    }
    if (this.specIds[row] === specId) {
      this.runs[row] = Math.min(65535, this.runs[row]! + 1)
      if (level > this.bests[row]!) this.bests[row] = level
      return
    }
    const list = this.extra.get(row) ?? []
    const pos = list.findIndex(s => s.specId === specId)
    if (pos < 0) list.push({ specId, runs: 1, best: Math.max(0, level) })
    else {
      list[pos]!.runs = Math.min(65535, list[pos]!.runs + 1)
      if (level > list[pos]!.best) list[pos]!.best = level
    }
    this.extra.set(row, list)
  }

  snapshot(specMeta: Map<number, { className: string, specName: string }>): {
    uniquePlayers: number
    keyLevelStats: MetaKeyLevelStats
    specPop: SpecPop[]
  } {
    const bySpec = new Map<number, { count: number, keyLevels: MetaKeyLevelStats }>()
    const keyLevelStats = emptyKeyLevelStats()
    for (let row = 0; row < this.size; row++) {
      const assigned = this.assigned(row)
      const rec = bySpec.get(assigned.specId) ?? { count: 0, keyLevels: emptyKeyLevelStats() }
      rec.count += 1
      observeKeyLevel(rec.keyLevels, assigned.best)
      observeKeyLevel(keyLevelStats, assigned.best)
      bySpec.set(assigned.specId, rec)
    }
    const specPop: SpecPop[] = []
    for (const [specId, rec] of bySpec) {
      const meta = specMeta.get(specId) || (() => {
        const looked = lookupBlizzardSpec(specId)
        return looked && findMetaClass(toMetaSlug(looked.className))
          ? { className: looked.className, specName: looked.specName }
          : null
      })()
      if (!meta || rec.count <= 0) continue
      specPop.push({
        className: meta.className,
        specName: meta.specName,
        count: rec.count,
        keyLevels: [],
        keyLevelStats: { ...rec.keyLevels },
      })
    }
    return { uniquePlayers: this.size, keyLevelStats, specPop }
  }
}

/** Lazy min-heap of per-spec cutoff keys (worst = lowest best, then runs). */
class SpecCutoffHeap {
  private readonly items: Array<{ key: string, best: number, runs: number }> = []

  get size() {
    return this.items.length
  }

  push(entry: { key: string, best: number, runs: number }) {
    this.items.push(entry)
    this.bubbleUp(this.items.length - 1)
  }

  peek(): { key: string, best: number, runs: number } | undefined {
    return this.items[0]
  }

  pop(): { key: string, best: number, runs: number } | undefined {
    const first = this.items[0]
    const last = this.items.pop()
    if (this.items.length && last) {
      this.items[0] = last
      this.bubbleDown(0)
    }
    return first
  }

  private worse(a: { best: number, runs: number }, b: { best: number, runs: number }) {
    return a.best < b.best || (a.best === b.best && a.runs < b.runs)
  }

  private bubbleUp(index: number) {
    const items = this.items
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (!this.worse(items[index]!, items[parent]!)) break
      const tmp = items[parent]!
      items[parent] = items[index]!
      items[index] = tmp
      index = parent
    }
  }

  private bubbleDown(index: number) {
    const items = this.items
    const n = items.length
    while (true) {
      let best = index
      const left = index * 2 + 1
      const right = left + 1
      if (left < n && this.worse(items[left]!, items[best]!)) best = left
      if (right < n && this.worse(items[right]!, items[best]!)) best = right
      if (best === index) break
      const tmp = items[best]!
      items[best] = items[index]!
      items[index] = tmp
      index = best
    }
  }
}

/** Compact per-player table for leaderboard ingest.
 *  A Map of object values retains the parsed board graph (EU-scale fixture:
 *  166k players → ~440 MB live). Parallel arrays stay around 70 MB uncapped.
 *  Each spec keeps only the top `capPerSpec` players by best (then runs), so
 *  a 400k-player region stays inside the CLI heap cap and the final per-spec
 *  top-N (by best) matches an uncapped run. */
export class MetaCandidateTable {
  private readonly index = new Map<string, number>()
  private readonly realms: string[] = []
  private readonly names: string[] = []
  private readonly specIds: number[][] = []
  private readonly runs: number[][] = []
  private readonly bests: number[][] = []
  private readonly bySpec = new Map<number, number[]>()
  private evicted = 0
  readonly capPerSpec: number
  private readonly heaps = new Map<number, SpecCutoffHeap>()
  readonly counters = new MetaIngestCounters()

  constructor(capPerSpec: number) {
    this.capPerSpec = Math.max(1, capPerSpec)
  }

  /** @deprecated Use capPerSpec; kept so older tests that read `.cap` still compile. */
  get cap() {
    return this.capPerSpec
  }

  get size() {
    return this.names.length
  }

  get dropped() {
    return Math.max(this.evicted, this.counters.uniquePlayers - this.size)
  }

  private scoreAt(row: number, specId: number): { runs: number, best: number } | null {
    const ids = this.specIds[row]
    if (!ids) return null
    const pos = ids.indexOf(specId)
    if (pos < 0) return null
    return { runs: this.runs[row]![pos]!, best: this.bests[row]![pos]! }
  }

  private pushCutoff(specId: number, key: string, best: number, runs: number) {
    let heap = this.heaps.get(specId)
    if (!heap) {
      heap = new SpecCutoffHeap()
      this.heaps.set(specId, heap)
    }
    heap.push({ key, best, runs })
  }

  /** Live worst (lowest best, then runs) for a spec. Heap entries use stable keys so swap-pop row ids cannot go stale. */
  private peekLiveWorst(specId: number): { key: string, row: number, runs: number, best: number } | null {
    const heap = this.heaps.get(specId)
    if (!heap) return null
    while (heap.peek()) {
      const top = heap.peek()!
      const row = this.index.get(top.key)
      if (row == null) {
        heap.pop()
        continue
      }
      const live = this.scoreAt(row, specId)
      if (!live) {
        heap.pop()
        continue
      }
      if (live.best !== top.best || live.runs !== top.runs) {
        heap.pop()
        heap.push({ key: top.key, best: live.best, runs: live.runs })
        continue
      }
      return { key: top.key, row, ...live }
    }
    return null
  }

  private beatsCutoff(specId: number, best: number, runs: number): boolean {
    const list = this.bySpec.get(specId)
    if (!list || list.length < this.capPerSpec) return true
    const worst = this.peekLiveWorst(specId)
    if (!worst) return true
    return best > worst.best || (best === worst.best && runs > worst.runs)
  }

  private evictWorst(specId: number) {
    const worst = this.peekLiveWorst(specId)
    if (!worst) return
    this.heaps.get(specId)?.pop()
    this.removePlayerSpec(worst.row, specId)
  }

  /** Evict every spec down to capPerSpec (or `keep` when given as a per-spec bound). */
  evictTo(keep: number = this.capPerSpec) {
    for (const specId of [...this.bySpec.keys()]) {
      let left = this.bySpec.get(specId)?.length ?? 0
      let steps = left
      while (left > keep) {
        if (steps-- <= 0) {
          throw new Error(`MetaCandidateTable.evictTo exceeded the iteration bound on spec ${specId}`)
        }
        this.evictWorst(specId)
        left = this.bySpec.get(specId)?.length ?? 0
      }
    }
  }

  private addToSpec(specId: number, row: number) {
    const list = this.bySpec.get(specId)
    if (list) list.push(row)
    else this.bySpec.set(specId, [row])
  }

  private removeFromSpecList(specId: number, row: number) {
    const list = this.bySpec.get(specId)
    if (!list) return
    const at = list.indexOf(row)
    if (at >= 0) list.splice(at, 1)
  }

  private removePlayerSpec(row: number, specId: number) {
    this.removeFromSpecList(specId, row)
    const ids = this.specIds[row]
    if (!ids) return
    const pos = ids.indexOf(specId)
    if (pos >= 0) {
      ids.splice(pos, 1)
      this.runs[row]!.splice(pos, 1)
      this.bests[row]!.splice(pos, 1)
    }
    this.evicted += 1
    if (ids.length === 0) this.removeRow(row)
  }

  private removeRow(row: number) {
    const last = this.names.length - 1
    if (last < 0) return
    const key = `${this.realms[row]}/${this.names[row]}`
    this.index.delete(key)
    if (row !== last) this.moveRow(last, row)
    this.realms.pop()
    this.names.pop()
    this.specIds.pop()
    this.runs.pop()
    this.bests.pop()
  }

  private moveRow(from: number, to: number) {
    const realm = this.realms[from]!
    const name = this.names[from]!
    this.realms[to] = realm
    this.names[to] = name
    this.specIds[to] = this.specIds[from]!
    this.runs[to] = this.runs[from]!
    this.bests[to] = this.bests[from]!
    this.index.set(`${realm}/${name}`, to)
    for (const specId of this.specIds[to]!) {
      const list = this.bySpec.get(specId)
      if (!list) continue
      for (let i = 0; i < list.length; i++) {
        if (list[i] === from) list[i] = to
      }
    }
  }

  add(realm: string, name: string, specId: number, level: number) {
    this.counters.observe(realm, name, specId, level)
    const key = `${realm}/${name}`
    let row = this.index.get(key)
    if (row == null) {
      if (!this.beatsCutoff(specId, level, 1)) {
        this.evicted += 1
        return
      }
      const list = this.bySpec.get(specId)
      if (list && list.length >= this.capPerSpec) this.evictWorst(specId)
      row = this.names.length
      this.index.set(key, row)
      this.realms.push(realm)
      this.names.push(name)
      this.specIds.push([specId])
      this.runs.push([1])
      this.bests.push([level])
      this.addToSpec(specId, row)
      this.pushCutoff(specId, key, level, 1)
      return
    }
    const ids = this.specIds[row]!
    const pos = ids.indexOf(specId)
    if (pos < 0) {
      if (!this.beatsCutoff(specId, level, 1)) {
        this.evicted += 1
        return
      }
      const list = this.bySpec.get(specId)
      if (list && list.length >= this.capPerSpec) this.evictWorst(specId)
      row = this.index.get(key)
      if (row == null) return
      this.specIds[row]!.push(specId)
      this.runs[row]!.push(1)
      this.bests[row]!.push(level)
      this.addToSpec(specId, row)
      this.pushCutoff(specId, key, level, 1)
      return
    }
    this.runs[row]![pos]! += 1
    if (level > this.bests[row]![pos]!) this.bests[row]![pos] = level
    // Score only improves. The heap is refreshed lazily in peekLiveWorst, so
    // we do not push a new node on every board sighting.
  }

  *players(): Iterable<{ realm: string, name: string, specs: Array<{ specId: number, runs: number, best: number }> }> {
    for (let i = 0; i < this.names.length; i++) {
      const ids = this.specIds[i]!
      const specs = ids.map((specId, pos) => ({
        specId,
        runs: this.runs[i]![pos]!,
        best: this.bests[i]![pos]!,
      }))
      yield { realm: this.realms[i]!, name: this.names[i]!, specs }
    }
  }

  /** Top `n` kept players per spec, ranked by best then runs (same order as final selection). */
  topBySpec(n: number): Map<number, Array<{ realm: string, name: string, best: number, runs: number }>> {
    const out = new Map<number, Array<{ realm: string, name: string, best: number, runs: number }>>()
    for (const [specId, rows] of this.bySpec) {
      const list = rows.map((row) => {
        const score = this.scoreAt(row, specId) ?? { runs: 0, best: 0 }
        return { realm: this.realms[row]!, name: this.names[row]!, ...score }
      })
      list.sort((a, b) => b.best - a.best || b.runs - a.runs)
      if (list.length > n) list.length = n
      out.set(specId, list)
    }
    return out
  }

  clear() {
    this.index.clear()
    this.realms.length = 0
    this.names.length = 0
    this.specIds.length = 0
    this.runs.length = 0
    this.bests.length = 0
    this.bySpec.clear()
    this.heaps.clear()
    this.evicted = 0
  }
}

export const META_HEAP_CHECK_EVERY_GROUPS = 32

function dungeonIdOf(board: unknown): number | null {
  const rec = asRecord(board)
  return asNumber(rec?.id)
    ?? asNumber(asRecord(rec?.map)?.id)
    ?? asNumber(asRecord(rec?.keystone_map)?.id)
}

/** Always include the current period, even when it is missing from the season period list. */
export function selectMetaPeriods(currentPeriodId: number, seasonPeriodIds: readonly number[], maxPeriods: number): NonNullable<MetaSnapshotPayload['periods']> {
  const cap = Math.max(1, Math.floor(maxPeriods) || 1)
  const older = [...new Set(seasonPeriodIds.filter(id => Number.isFinite(id) && id !== currentPeriodId && id <= currentPeriodId))].sort((a, b) => b - a)
  return {
    current: { id: currentPeriodId },
    included: [currentPeriodId, ...older].slice(0, cap).map(id => ({ id })),
  }
}

export function mergeMetaSyncCaps(partial?: Partial<MetaSyncCaps>): MetaSyncCaps {
  const caps = { ...META_SYNC_DEFAULT_CAPS, ...partial }
  caps.maxRps = Math.min(Math.max(1, caps.maxRps), 50)
  caps.maxAttemptsPerSpec = Math.max(caps.maxAttemptsPerSpec, caps.samplePerSpec)
  caps.periods = Math.max(1, caps.periods)
  caps.maxConcurrentSpecs = Math.min(Math.max(1, caps.maxConcurrentSpecs), 8)
  const requestedPerSpec = partial?.maxCandidatesPerSpec
  caps.maxCandidatesPerSpec = Math.max(
    caps.maxAttemptsPerSpec,
    requestedPerSpec != null && Number.isFinite(requestedPerSpec) && requestedPerSpec > 0
      ? Math.floor(requestedPerSpec)
      : META_SYNC_DEFAULT_MAX_PER_SPEC,
  )
  caps.maxSpecs = Math.max(0, Math.floor(Number(caps.maxSpecs) || 0))
  return caps
}

function mergeCaps(partial?: Partial<MetaSyncCaps>): MetaSyncCaps {
  return mergeMetaSyncCaps(partial)
}

function asClock(now?: number | (() => number)): () => number {
  if (typeof now === 'function') return now
  if (typeof now === 'number' && Number.isFinite(now)) {
    const frozen = now
    return () => frozen
  }
  return () => Date.now()
}

function assertDeadline(deadline: number | undefined, now: () => number) {
  if (deadline != null && now() >= deadline) throw new Error('Meta nightly hit the job deadline')
}

export function isMetaDeadlineError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('job deadline')
}

export function sleepUntilMetaDeadline(
  sleep: ((ms: number) => Promise<void>) | undefined,
  deadline: number | undefined,
  now: () => number,
): (ms: number) => Promise<void> {
  const base = sleep ?? ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)))
  return async (ms: number) => {
    if (deadline == null) {
      await base(ms)
      return
    }
    const remaining = deadline - now()
    if (remaining <= 0) throw new Error('Meta nightly hit the job deadline')
    await base(Math.min(ms, remaining))
    if (now() >= deadline) throw new Error('Meta nightly hit the job deadline')
  }
}

function throwIfDeadlineAborted(abort?: AbortController) {
  if (!abort?.signal.aborted) return
  if (isMetaDeadlineError(abort.signal.reason)) {
    throw abort.signal.reason instanceof Error
      ? abort.signal.reason
      : new Error('Meta nightly hit the job deadline')
  }
}

const META_SYNC_PROGRESS_EVERY_CALLS = 50

async function requestToken(
  fetcher: BlizzardFetcher,
  credentials: BlizzardCredentials,
  options: { sleep?: (ms: number) => Promise<void>, now?: number | (() => number), stats?: BlizzardHttpStats, traffic?: BlizzardTraffic },
) {
  const secrets = [credentials.id, credentials.secret]
  const res = await blizzardRequest(fetcher, {
    method: 'POST',
    url: BLIZZARD_TOKEN_URL,
    headers: {
      Authorization: basicAuthHeader(credentials),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MagguuUI-Website/meta',
    },
    body: 'grant_type=client_credentials',
  }, { sleep: options.sleep, now: options.now, secrets, stats: options.stats, traffic: options.traffic })
  return (asRecord(res.body) ?? {}) as { access_token?: unknown, expires_in?: unknown }
}

function createGetter(
  options: SyncOptions,
  stats: BlizzardHttpStats,
  traffic: BlizzardTraffic,
  secrets: readonly string[],
  abort: AbortController,
) {
  let token = ''
  const now = asClock(options.now)
  const startedAt = now()
  let lastProgressCalls = 0
  let lastProgressAt = startedAt
  const maybeLogProgress = () => {
    const calls = stats.calls
    if (calls === 0 || calls - lastProgressCalls < META_SYNC_PROGRESS_EVERY_CALLS) return
    const t = now()
    const elapsed = Math.max(1, t - startedAt)
    const window = Math.max(1, t - lastProgressAt)
    const delta = calls - lastProgressCalls
    const windowRps = (delta * 1000) / window
    const overallRps = (calls * 1000) / elapsed
    options.warn?.(`[blizzard:nightly] progress calls=${calls} elapsed=${(elapsed / 1000).toFixed(1)}s rate=${windowRps.toFixed(1)} rps (overall ${overallRps.toFixed(1)})`)
    lastProgressCalls = calls
    lastProgressAt = t
  }
  const refresh = async (force = false) => {
    if (force) resetBlizzardAccessTokenCache()
    token = await getBlizzardAccessToken(
      options.credentials,
      creds => requestToken(options.fetcher, creds, { sleep: options.sleep, now, stats, traffic }),
      now(),
    )
    return token
  }

  const get = async (path: string, namespace: string, soft = true): Promise<unknown> => {
    if (syncAborted(abort)) {
      throwIfDeadlineAborted(abort)
      return null
    }
    try {
      assertDeadline(options.deadline, now)
    } catch (error) {
      tripAbort(abort, error)
    }
    if (!token) await refresh()
    const sep = path.includes('?') ? '&' : '?'
    const url = `${API_ROOT}${path}${sep}namespace=${namespace}&locale=${LOCALE}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'MagguuUI-Website/meta',
    }
    const res = await blizzardRequest(options.fetcher, { method: 'GET', url, headers }, {
      sleep: options.sleep,
      now,
      secrets,
      stats,
      traffic,
      soft,
      onUnauthorized: async () => {
        const next = await refresh(true)
        headers.Authorization = `Bearer ${next}`
      },
    })
    maybeLogProgress()
    if (res.status >= 400 || res.status === 0) return null
    return res.body
  }

  return { get, refresh }
}

function syncAborted(abort?: AbortController) {
  return Boolean(abort?.signal.aborted)
}

async function mapPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
  abort?: AbortController,
): Promise<void> {
  let next = 0
  const limit = Math.max(1, Math.min(concurrency, items.length || 1))
  const run = async () => {
    while (next < items.length) {
      if (syncAborted(abort)) return
      const index = next
      next += 1
      try {
        await worker(items[index]!, index)
      } catch (error) {
        if (abort && !abort.signal.aborted) abort.abort(error)
        throw error
      }
    }
  }
  const results = await Promise.allSettled(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => run()))
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (rejected) throw rejected.reason
}

function tripAbort(abort: AbortController, error: unknown): never {
  if (!abort.signal.aborted) abort.abort(error)
  throw error
}

function runGuards(abort: AbortController, deadline: number | undefined, now: () => number, heap: MetaHeapMonitor) {
  try {
    assertDeadline(deadline, now)
    assertMetaHeapSafe(heap)
  } catch (error) {
    tripAbort(abort, error)
  }
}

function openStagingDb(sqlite?: MetaSqlite): { sqlite: MetaSqlite, close: () => void } {
  if (sqlite) return { sqlite, close: () => {} }
  const db = new Database(':memory:')
  return { sqlite: db, close: () => { db.close() } }
}

export type MetaPreSpecStats = {
  realms: number
  dungeons: number
  periods: number
  planned: number
  ok: number
  failed: number
  candidates: number
  retained: number
  incomingPlayers: number
  dropped: MetaSyncDroppedCounts
  keyLevelStats: MetaKeyLevelStats
}

function assemblePayloadFromStaging(input: {
  sqlite: MetaSqlite
  runToken: string
  nowMs: number
  failures: Pick<ProfileFailures, 'notFound' | 'specMismatch'>
}): { payload: MetaSnapshotPayload, outdatedDropped: number, unknownTalentNodes: number } | null {
  const context = readMetaSyncRunContext(input.sqlite, input.runToken)
  if (!context) return null
  const stagedSpecs = readMetaSyncSpecAggregates(input.sqlite, input.runToken)
  const specPopFromStage = new Map(context.specPop.map(pop => [`${pop.className}|${pop.specName}`, pop] as const))
  const hashCount = new Map<string, number>()
  for (const stage of stagedSpecs) {
    for (const [hash, serialized] of Object.entries(stage.bucketsByHash)) {
      const key = `${stage.className}:${hash}`
      hashCount.set(key, (hashCount.get(key) ?? 0) + (serialized.profiles ?? 0))
    }
  }
  const currentHashByClass = new Map<string, string>()
  for (const [key, count] of hashCount) {
    const split = key.indexOf(':')
    const className = key.slice(0, split)
    const hash = key.slice(split + 1)
    const current = currentHashByClass.get(className)
    if (!current || count > (hashCount.get(`${className}:${current}`) ?? 0)) currentHashByClass.set(className, hash)
  }

  const layouts = new Map<string, MetaTalentLayout>()
  const profileBySpec = new Map<string, ProfileBucket>()
  let unknownTalentNodes = 0
  const versions: number[] = []
  let outdatedDropped = 0
  for (const stage of stagedSpecs) {
    const key = `${stage.className}|${stage.specName}`
    const layoutKey = `${toMetaSlug(stage.className)}|${toMetaSlug(stage.specName)}`
    if (stage.layout) layouts.set(layoutKey, stage.layout)
    const current = currentHashByClass.get(stage.className)
    let dropped = 0
    for (const [hash, serialized] of Object.entries(stage.bucketsByHash)) {
      const profiles = serialized.profiles ?? 0
      if (current && hash === current) {
        profileBySpec.set(key, deserializeProfileBucket(serialized))
      } else {
        dropped += profiles
      }
    }
    if (!profileBySpec.has(key)) profileBySpec.set(key, emptyProfileBucket())
    outdatedDropped += dropped
    if (current) {
      for (const version of stage.versionsByHash[current] ?? []) versions.push(version)
    }
    unknownTalentNodes += profileBySpec.get(key)!.unknownTalentNodes
  }

  const classes = buildClassSummaries(specPopFromStage, profileBySpec, context.totalCharacters)
  attachSpecLayouts(classes, layouts)

  const hashes = [...new Set(currentHashByClass.values())]
  const version = versions.sort((a, b) => versions.filter(v => v === b).length - versions.filter(v => v === a).length)[0]
  const talentTree: MetaTalentTreeState | null = hashes.length === 1
    ? { hash: hashes[0]!, build: version != null ? String(version) : null }
    : { hash: null, build: version != null ? String(version) : null }

  const successfulProfiles = [...profileBySpec.values()].reduce((sum, bucket) => sum + bucket.profiles, 0)
  const keyLevels = metaKeyLevelsFromStats(context.keyLevelStats) ?? minMax(context.allKeyLevels)
  const fetchedAt = Math.floor(input.nowMs / 1000)
  const season = context.season
  const periods = context.periods
  const payload: MetaSnapshotPayload = {
    region: META_REGION,
    focus: META_FOCUS,
    season,
    periods,
    talentTree,
    freshness: {
      fetchedAt,
      players: context.totalCharacters,
      keyLevels,
      region: META_REGION,
      source: 'blizzard',
    },
    basis: {
      region: META_REGION,
      focus: META_FOCUS,
      season,
      periods,
      talentTree,
      keyLevels,
      players: context.totalCharacters,
      profiles: successfulProfiles,
      source: 'blizzard',
    },
    sampled: {
      realms: context.realmCount,
      leaderboards: context.leaderboards.ok,
      players: context.totalCharacters,
      profiles: successfulProfiles,
      skipped404: input.failures.notFound,
      specMismatch: input.failures.specMismatch,
      unknownTalentNodes,
    },
    classes,
  }
  return { payload, outdatedDropped, unknownTalentNodes }
}

export async function buildMetaSnapshot(options: SyncOptions): Promise<{
  payload: MetaSnapshotPayload
  stats: BlizzardHttpStats
  failures: ProfileFailures
  leaderboards: { planned: number, ok: number, failed: number }
  preSpec?: MetaPreSpecStats
  hitDeadline?: boolean
}> {
  const caps = mergeCaps(options.caps)
  const clock = asClock(options.now)
  const sleep = sleepUntilMetaDeadline(options.sleep, options.deadline, clock)
  options = { ...options, sleep }
  const now = clock()
  const stats = options.stats ?? createBlizzardHttpStats()
  const traffic = options.traffic ?? createBlizzardTraffic({
    maxRps: caps.maxRps,
    concurrency: caps.concurrency,
    sleep,
    now: clock,
  })
  const secrets = [options.credentials.id, options.credentials.secret]
  const heap = options.heap ?? defaultMetaHeapMonitor()
  const abort = options.abortController ?? new AbortController()
  const { get } = createGetter(options, stats, traffic, secrets, abort)
  const staging = openStagingDb(options.sqlite)
  const runToken = options.runToken || `meta-sync-${clock()}`
  clearExpiredMetaSyncStaging(staging.sqlite, now)
  const failures: ProfileFailures = {
    notFound: 0, other: 0, specMismatch: 0, noLoadout: 0,
    badLoadoutCode: 0, outdatedTree: 0, exceptions: 0, attempted: 0,
  }

  try {
  const seasonIndex = asRecord(await get('/data/wow/mythic-keystone/season/index', DYNAMIC, false))
  const seasonId = asNumber(asRecord(seasonIndex?.current_season)?.id)
  if (seasonId == null) throw new Error('Blizzard season index did not include a current season')
  const seasonBody = asRecord(await get(`/data/wow/mythic-keystone/season/${seasonId}`, DYNAMIC, false))
  const seasonLabel = asString(seasonBody?.season_name) || asString(seasonBody?.name) || `Season ${seasonId}`

  const periodIndex = asRecord(await get('/data/wow/mythic-keystone/period/index', DYNAMIC, false))
  const currentPeriodId = asNumber(asRecord(periodIndex?.current_period)?.id)
  if (currentPeriodId == null) throw new Error('Blizzard period index did not include a current period')
  const seasonPeriodIds = asArray(seasonBody?.periods)
    .map(item => asNumber(asRecord(item)?.id) ?? asNumber(item))
    .filter((id): id is number => id != null && id <= currentPeriodId)
    .sort((a, b) => b - a)
  const periods = selectMetaPeriods(currentPeriodId, seasonPeriodIds, caps.periods)
  const periodIds = periods.included.map(row => row.id)

  const realmIndex = asRecord(await get('/data/wow/connected-realm/index', DYNAMIC, false))
  let realmIds = asArray(realmIndex?.connected_realms)
    .map(item => idFromHref(asString(asRecord(item)?.href)))
    .filter((id): id is number => id != null)
    .sort((a, b) => a - b)
  if (caps.maxRealms > 0) realmIds = realmIds.slice(0, caps.maxRealms)
  if (!realmIds.length) throw new Error('No connected realms were returned')

  const boardIndex = asRecord(await get(`/data/wow/connected-realm/${realmIds[0]}/mythic-leaderboard/index`, DYNAMIC, false))
  const dungeonIds = asArray(boardIndex?.current_leaderboards)
    .map(dungeonIdOf)
    .filter((id): id is number => id != null)
  if (!dungeonIds.length) throw new Error('No mythic leaderboards were returned')

  const jobs: Array<[number, number, number]> = []
  for (const realmId of realmIds) {
    for (const dungeonId of dungeonIds) {
      for (const periodId of periodIds) jobs.push([realmId, dungeonId, periodId])
    }
  }

  const candidates = new MetaCandidateTable(caps.maxCandidatesPerSpec)
  let leaderboardsOk = 0
  let leaderboardsFailed = 0

  await mapPool(jobs, caps.concurrency, async ([realmId, dungeonId, periodId]) => {
    if (syncAborted(abort)) return
    runGuards(abort, options.deadline, asClock(options.now), heap)
    if (syncAborted(abort)) return
    const board = asRecord(await get(`/data/wow/connected-realm/${realmId}/mythic-leaderboard/${dungeonId}/period/${periodId}`, DYNAMIC))
    if (!board) {
      leaderboardsFailed += 1
      return
    }
    leaderboardsOk += 1
    const groups = asArray(board.leading_groups)
    board.leading_groups = undefined
    let processedGroups = 0
    for (const rawGroup of groups) {
      const group = asRecord(rawGroup)
      if (!group) continue
      const level = asNumber(group.keystone_level) ?? 0
      const members = asArray(group.members)
      for (const rawMember of members) {
        const rec = asRecord(rawMember)
        const profile = asRecord(rec?.profile)
        const realm = toMetaSlug(asString(asRecord(profile?.realm)?.slug) || asString(asRecord(profile?.realm)?.name))
        const name = asString(profile?.name).toLowerCase()
        if (!realm || !name) continue
        const specRec = asRecord(rec?.specialization)
        const specId = asNumber(specRec?.id)
        if (specId == null) continue
        candidates.add(realm, name, specId, level)
      }
      processedGroups += 1
      if (processedGroups % META_HEAP_CHECK_EVERY_GROUPS === 0) {
        runGuards(abort, options.deadline, asClock(options.now), heap)
        if (syncAborted(abort)) return
      }
    }
  }, abort)

  const specIndex = asRecord(await get('/data/wow/playable-specialization/index', STATIC))
  const specMeta = new Map<number, { className: string, specName: string, treeHref: string | null }>()
  const specEntries = asArray(specIndex?.character_specializations)
  await mapPool(specEntries, 1, async (item) => {
    if (syncAborted(abort)) return
    const id = asNumber(asRecord(item)?.id)
    if (id == null) return
    const body = asRecord(await get(`/data/wow/playable-specialization/${id}`, STATIC))
    if (!body) return
    const className = asString(asRecord(body.playable_class)?.name)
    const specName = asString(body.name)
    const looked = lookupBlizzardSpec(id, specName, className) || (className && specName ? { className, specName } : null)
    if (!looked || !findMetaClass(toMetaSlug(looked.className))) return
    const treeHref = asString(asRecord(asRecord(body.spec_talent_tree)?.key)?.href)
    specMeta.set(id, { className: looked.className, specName: looked.specName, treeHref: treeHref || null })
  }, abort)

  candidates.evictTo(caps.maxCandidatesPerSpec)
  const ingest = candidates.counters.snapshot(specMeta)
  const perSpec = new Map<number, CharacterCandidate[]>()
  for (const candidate of candidates.players()) {
    const assigned = [...candidate.specs].sort((a, b) => b.runs - a.runs || b.best - a.best)[0]
    if (!assigned) continue
    const meta = specMeta.get(assigned.specId) || (() => {
      const looked = lookupBlizzardSpec(assigned.specId)
      return looked && findMetaClass(toMetaSlug(looked.className))
        ? { className: looked.className, specName: looked.specName, treeHref: null }
        : null
    })()
    if (!meta) continue
    const row: CharacterCandidate = {
      realm: candidate.realm,
      name: candidate.name,
      specId: assigned.specId,
      className: meta.className,
      specName: meta.specName,
      best: assigned.best,
      runs: assigned.runs,
    }
    const list = perSpec.get(assigned.specId) ?? []
    list.push(row)
    perSpec.set(assigned.specId, list)
  }
  let retained = 0
  let droppedTrim = 0
  for (const list of perSpec.values()) {
    list.sort((a, b) => b.best - a.best || b.runs - a.runs)
    if (list.length > caps.maxAttemptsPerSpec) {
      droppedTrim += list.length - caps.maxAttemptsPerSpec
      list.length = caps.maxAttemptsPerSpec
    }
    retained += list.length
  }
  const totalCharacters = ingest.uniquePlayers
  const candidateCount = candidates.size
  const droppedIngest = Math.max(0, ingest.uniquePlayers - candidateCount)
  const dropped = { ingest: droppedIngest, trim: droppedTrim, total: droppedIngest + droppedTrim }
  if (droppedIngest > 0) {
    options.warn?.(`Meta ingest dropped ${droppedIngest} candidates under the per-spec top-${caps.maxCandidatesPerSpec} cap (unique ${ingest.uniquePlayers}, kept ${candidateCount})`)
  }
  const preSpec: MetaPreSpecStats = {
    realms: realmIds.length,
    dungeons: dungeonIds.length,
    periods: periodIds.length,
    planned: jobs.length,
    ok: leaderboardsOk,
    failed: leaderboardsFailed,
    candidates: candidateCount,
    retained,
    incomingPlayers: ingest.uniquePlayers,
    dropped,
    keyLevelStats: ingest.keyLevelStats,
  }

  runGuards(abort, options.deadline, asClock(options.now), heap)
  if (syncAborted(abort)) throw new Error('Meta nightly aborted')
  writeMetaSyncRunContext(staging.sqlite, runToken, {
    season: { id: seasonId, label: seasonLabel },
    periods,
    realmCount: realmIds.length,
    leaderboards: { planned: jobs.length, ok: leaderboardsOk, failed: leaderboardsFailed },
    specPop: ingest.specPop,
    totalCharacters,
    allKeyLevels: [],
    keyLevelStats: ingest.keyLevelStats,
    dropped,
  })
  options.onAfterPreSpec?.(preSpec)
  candidates.clear()

  if (options.stopAfter === 'pre-spec') {
    return {
      payload: {
        region: META_REGION,
        focus: META_FOCUS,
        season: { id: seasonId, label: seasonLabel },
        periods,
        talentTree: null,
        freshness: {
          fetchedAt: Math.floor(clock() / 1000),
          players: totalCharacters,
          keyLevels: metaKeyLevelsFromStats(ingest.keyLevelStats),
          region: META_REGION,
          source: 'blizzard',
        },
        basis: {
          region: META_REGION,
          focus: META_FOCUS,
          season: { id: seasonId, label: seasonLabel },
          periods,
          talentTree: null,
          keyLevels: metaKeyLevelsFromStats(ingest.keyLevelStats),
          players: totalCharacters,
          profiles: 0,
          source: 'blizzard',
        },
        sampled: {
          realms: realmIds.length,
          leaderboards: leaderboardsOk,
          players: totalCharacters,
          profiles: 0,
          skipped404: 0,
          specMismatch: 0,
          unknownTalentNodes: 0,
        },
        classes: [],
      },
      stats,
      failures,
      leaderboards: { planned: jobs.length, ok: leaderboardsOk, failed: leaderboardsFailed },
      preSpec,
    }
  }

  const specIds = caps.maxSpecs > 0 ? [...perSpec.keys()].slice(0, caps.maxSpecs) : [...perSpec.keys()]
  let hitDeadline = false
  try {
  await mapPool(specIds, caps.maxConcurrentSpecs, async (specId) => {
    throwIfDeadlineAborted(abort)
    if (syncAborted(abort)) return
    runGuards(abort, options.deadline, asClock(options.now), heap)
    const list = perSpec.get(specId) ?? []
    const meta = specMeta.get(specId) || (list[0] ? { className: list[0].className, specName: list[0].specName, treeHref: null as string | null } : null)
    if (!meta) {
      perSpec.delete(specId)
      return
    }

    const specStartedAt = asClock(options.now)()
    const callsBefore = stats.calls
    options.warn?.(`[blizzard:nightly] spec ${meta.className}/${meta.specName} start candidates=${list.length}`)

    let layout = null
    const href = specMeta.get(specId)?.treeHref
    const match = href?.match(/talent-tree\/(\d+)\/playable-specialization\/(\d+)/)
    if (match) {
      throwIfDeadlineAborted(abort)
      if (syncAborted(abort)) return
      const body = await get(`/data/wow/talent-tree/${match[1]}/playable-specialization/${match[2]}`, STATIC)
      layout = parseTalentTreeLayout(body, specId)
    }
    const known = layout ? knownIdsFromTalentLayout(layout) : undefined

    const bucketsByHash = new Map<string, ProfileBucket>()
    const versionsByHash: Record<string, number[]> = {}
    let cursor = 0
    let profiles = 0
    let attempts = 0
    let stopSampling = false
    const takeNext = (): CharacterCandidate | null => {
      throwIfDeadlineAborted(abort)
      if (syncAborted(abort) || stopSampling) return null
      if (profiles >= caps.samplePerSpec) return null
      if (cursor >= list.length || cursor >= caps.maxAttemptsPerSpec) return null
      const row = list[cursor]!
      cursor += 1
      return row
    }
    // Leave traffic-gate slots for other in-flight specs (default maxConcurrentSpecs is 1).
    const profileConcurrency = Math.max(1, Math.min(
      caps.concurrency,
      caps.maxAttemptsPerSpec,
      list.length || 1,
      Math.floor(caps.concurrency / Math.max(1, caps.maxConcurrentSpecs)) || 1,
    ))
    const sampleWorker = async () => {
      for (;;) {
        throwIfDeadlineAborted(abort)
        if (syncAborted(abort)) return
        runGuards(abort, options.deadline, asClock(options.now), heap)
        const target = takeNext()
        if (!target) return
        attempts += 1
        failures.attempted += 1
        try {
          const base = `/profile/wow/character/${encodeURIComponent(target.realm)}/${encodeURIComponent(target.name)}`
          throwIfDeadlineAborted(abort)
          if (syncAborted(abort)) return
          const summary = asRecord(await get(base, PROFILE))
          if (!summary) {
            failures.notFound += 1
            continue
          }
          const activeId = asNumber(asRecord(summary.active_spec)?.id) ?? asNumber(asRecord(summary.active_specialization)?.id)
          if (activeId != null && activeId !== specId) {
            failures.specMismatch += 1
            continue
          }
          throwIfDeadlineAborted(abort)
          if (syncAborted(abort)) return
          const specsBody = await get(`${base}/specializations`, PROFILE)
          throwIfDeadlineAborted(abort)
          if (syncAborted(abort)) return
          const equipmentBody = await get(`${base}/equipment`, PROFILE)
          if (!specsBody || !equipmentBody) {
            failures.other += 1
            continue
          }
          const looked = lookupBlizzardSpec(
            activeId ?? specId,
            asString(asRecord(asRecord(specsBody)?.active_specialization)?.name) || target.specName,
            playableClassName(specsBody, target.className),
          ) || { className: target.className, specName: target.specName }
          if (toMetaSlug(looked.specName) !== toMetaSlug(target.specName)) {
            failures.specMismatch += 1
            continue
          }
          const loadouts = extractActiveLoadouts(specsBody)
          const loadout = loadouts[0]
          if (!loadout?.code) {
            failures.noLoadout += 1
            continue
          }
          const header = loadout.header || decodeLoadoutHeader(loadout.code)
          if (!header || header.specId !== specId) {
            failures.badLoadoutCode += 1
            continue
          }
          const bucket = bucketsByHash.get(header.treeHash) ?? emptyProfileBucket()
          const tree = { hash: header.treeHash, build: null, nodeIds: known?.nodes ?? new Set() }
          absorbProfile(bucket, {
            specsBody,
            equipmentBody,
            characterBody: summary,
            tree,
            knownNodes: known?.nodes,
            knownTalentIds: known?.talentIds,
          })
          bucketsByHash.set(header.treeHash, bucket)
          const versionList = versionsByHash[header.treeHash] ?? (versionsByHash[header.treeHash] = [])
          versionList.push(header.version)
          profiles += 1
          if (profiles >= caps.samplePerSpec) stopSampling = true
        } catch (error) {
          if (isMetaDeadlineError(error) || (error instanceof Error && /aborted/i.test(error.message))) throw error
          failures.exceptions += 1
        }
      }
    }
    await Promise.all(Array.from({ length: profileConcurrency }, () => sampleWorker()))

    throwIfDeadlineAborted(abort)
    if (syncAborted(abort)) return
    writeMetaSyncSpecAggregate(staging.sqlite, runToken, {
      specId,
      className: meta.className,
      specName: meta.specName,
      bucketsByHash: Object.fromEntries([...bucketsByHash.entries()].map(([hash, bucket]) => [hash, serializeProfileBucket(bucket)])),
      versionsByHash,
      layout,
    })
    runGuards(abort, options.deadline, asClock(options.now), heap)
    bucketsByHash.clear()
    perSpec.delete(specId)
    const elapsed = Math.max(1, asClock(options.now)() - specStartedAt)
    const specCalls = stats.calls - callsBefore
    const rps = (specCalls * 1000) / elapsed
    options.warn?.(`[blizzard:nightly] spec ${meta.className}/${meta.specName} done profiles=${profiles} attempts=${attempts} duration=${(elapsed / 1000).toFixed(1)}s rate=${rps.toFixed(1)} rps`)
    if (options.onPartialSnapshot) {
      const partial = assemblePayloadFromStaging({
        sqlite: staging.sqlite,
        runToken,
        nowMs: asClock(options.now)(),
        failures,
      })
      if (partial && metaSnapshotCoverage(partial.payload).specsWithData > 0) {
        options.onPartialSnapshot(partial.payload)
      }
    }
  }, abort)
  } catch (error) {
    if (!isMetaDeadlineError(error)) throw error
    hitDeadline = true
  }

  if (syncAborted(abort) && !hitDeadline) throw new Error('Meta nightly aborted')
  if (!hitDeadline) {
    try {
      runGuards(abort, options.deadline, asClock(options.now), heap)
    } catch (error) {
      if (!isMetaDeadlineError(error)) throw error
      hitDeadline = true
    }
  }
  const assembled = assemblePayloadFromStaging({
    sqlite: staging.sqlite,
    runToken,
    nowMs: asClock(options.now)(),
    failures,
  })
  if (!assembled) {
    if (hitDeadline) throw new Error('Meta nightly hit the job deadline')
    throw new Error('Meta nightly staging context was missing')
  }
  if (hitDeadline && metaSnapshotCoverage(assembled.payload).specsWithData === 0) {
    throw new Error('Meta nightly hit the job deadline')
  }
  failures.outdatedTree += assembled.outdatedDropped
  const classes = assembled.payload.classes

  if (!hitDeadline) {
    try {
      const itemIds = collectItemIds(classes)
      const itemIcons = new Map<number, string>()
      await mapPool(itemIds, caps.concurrency, async (id) => {
        throwIfDeadlineAborted(abort)
        if (syncAborted(abort)) return
        const icon = extractMediaIcon(await get(`/data/wow/media/item/${id}`, STATIC))
        if (icon) itemIcons.set(id, icon)
      }, abort)
      applyItemIcons(classes, itemIcons)

      const spellIds = collectSpellIds(classes)
      const spellIcons = new Map<number, string>()
      await mapPool(spellIds, caps.concurrency, async (id) => {
        throwIfDeadlineAborted(abort)
        if (syncAborted(abort)) return
        const icon = extractMediaIcon(await get(`/data/wow/media/spell/${id}`, STATIC))
        if (icon) spellIcons.set(id, icon)
      }, abort)
      applySpellIcons(classes, spellIcons)
      if (syncAborted(abort)) throw new Error('Meta nightly aborted')
    } catch (error) {
      if (isMetaDeadlineError(error)) {
        hitDeadline = true
      } else {
        throw error
      }
    }
  }

  const context = readMetaSyncRunContext(staging.sqlite, runToken)
  const leaderboards = context?.leaderboards ?? { planned: 0, ok: assembled.payload.sampled.leaderboards, failed: 0 }
  clearMetaSyncStaging(staging.sqlite, runToken)
  return {
    payload: assembled.payload,
    stats,
    failures,
    leaderboards,
    preSpec,
    hitDeadline: hitDeadline || undefined,
  }

  } finally {
    try { clearMetaSyncStaging(staging.sqlite, runToken) } catch { /* keep the original error */ }
    staging.close()
  }
}


export async function runScheduledBlizzardMetaSync(input: {
  sqlite: MetaSqlite
  config: {
    metaNightly?: unknown
    blizzardClientId?: unknown
    blizzardClientSecret?: unknown
    blizzardRegion?: unknown
    metaKumaPushUrl?: unknown
    metaSamplePerSpec?: unknown
    metaMaxAttemptsPerSpec?: unknown
    metaMaxConcurrentSpecs?: unknown
  }
  fetcher: BlizzardFetcher
  sleep?: (ms: number) => Promise<void>
  now?: number | (() => number)
  nodeEnv?: string
  warn?: (message: string) => void
  caps?: Partial<MetaSyncCaps>
  kumaPush?: typeof pushMetaKuma
  purgeMeta?: typeof purgeCloudflareMeta
  deadline?: number
  heap?: MetaHeapMonitor
  abortController?: AbortController
  /** Manual CLI: run the same job path even when NUXT_META_NIGHTLY is off. Still needs credentials. */
  force?: boolean
}): Promise<ScheduledMetaResult> {
  const clock = asClock(input.now)
  const startedAt = clock()
  const deadline = input.deadline ?? (startedAt + META_JOB_TIMEOUT_MS)
  const nightlyOn = metaNightlyFromRuntimeConfig(
    { metaNightly: input.config.metaNightly },
    input.nodeEnv,
    input.warn,
  )
  blizzardRegionFromRuntimeConfig(input.config, input.warn)
  const finish = async (status: MetaRunStatus, reason?: string, snapshotId?: number | null, stats?: BlizzardHttpStats, failures?: ProfileFailures, nPerSpec?: Record<string, number> | null, dropped?: MetaSyncDroppedCounts, partialOutcome?: MetaPartialOutcome) => {
    const record = recordMetaRun(input.sqlite, {
      startedAt,
      endedAt: clock(),
      status,
      reason: reason ?? null,
      calls: stats?.calls ?? 0,
      http429: stats?.http429 ?? 0,
      http404: stats?.http404 ?? 0,
      specMismatch: failures?.specMismatch ?? 0,
      snapshotId: snapshotId ?? null,
      nPerSpec: nPerSpec ?? null,
    })
    const push = input.kumaPush ?? pushMetaKuma
    await push(input.config.metaKumaPushUrl, kumaStatusForMetaRun(status), reason || status)
    const specsWithData = nPerSpec ? Object.values(nPerSpec).filter(n => n > 0).length : 0
    return {
      status,
      reason,
      snapshotId: record.snapshotId,
      http429: stats?.http429 ?? 0,
      specsWithData,
      durationMs: clock() - startedAt,
      dropped,
      ...(partialOutcome ? { partialOutcome } : {}),
    }
  }

  const credentials = blizzardCredentialsFromConfig(input.config)
  if (!nightlyOn && !input.force) {
    const locked = await withBlizzardMetaLock(input.sqlite, async () => {
      deleteExpiredMetaSnapshots(input.sqlite, clock())
    }, clock, deadline)
    if (!locked.ok) return finish('locked', 'A Meta update is already running')
    return finish('skipped', 'Disabled (NUXT_META_NIGHTLY is off)')
  }
  if (!credentials) {
    return finish('skipped', 'Disabled (NUXT_BLIZZARD_CLIENT_ID / NUXT_BLIZZARD_CLIENT_SECRET missing)')
  }

  const sampleCaps = sampleCapsFromRuntimeConfig(input.config)
  const caps = mergeCaps({ ...sampleCaps, ...input.caps })
  const locked = await withBlizzardMetaLock(input.sqlite, async () => {
    try {
    deleteExpiredMetaSnapshots(input.sqlite, clock())
    const previous = readCurrentMetaSnapshot(input.sqlite, META_REGION, clock())
    const built = await buildMetaSnapshot({
      fetcher: input.fetcher,
      credentials,
      sleep: input.sleep,
      now: clock,
      caps,
      warn: input.warn,
      deadline,
      sqlite: input.sqlite,
      heap: input.heap,
      runToken: `meta-sync-${startedAt}`,
      abortController: input.abortController,
    })
    const nPerSpec: Record<string, number> = {}
    for (const cls of built.payload.classes) {
      for (const spec of cls.specs) nPerSpec[`${cls.slug}/${spec.slug}`] = spec.n
    }
    if (built.hitDeadline) {
      const plannedProfiles = Math.max(built.failures.attempted, built.payload.sampled.profiles)
      const decision = decideDeadlinePartialPublish({
        payload: built.payload,
        previous: previous?.payload ?? null,
        plannedProfiles,
        successfulProfiles: built.payload.sampled.profiles,
        stats: built.stats,
      })
      if (decision.outcome === 'not-published' && metaSnapshotCoverage(built.payload).specsWithData === 0) {
        return {
          status: 'error' as const,
          reason: 'Meta nightly hit the job deadline',
          snapshotId: null as number | null,
          stats: built.stats,
          failures: built.failures,
          nPerSpec,
          dropped: built.preSpec?.dropped,
        }
      }
      if (decision.outcome !== 'published') {
        const kept = decision.outcome === 'kept-last-good'
        return {
          status: 'partial' as const,
          reason: kept
            ? `Meta nightly hit the job deadline; kept last-good snapshot${decision.reasons.length ? ` (${decision.reasons.join('; ')})` : ''}`
            : `Meta nightly hit the job deadline; ${decision.reasons.join('; ') || 'partial not published'}`,
          snapshotId: kept ? previous!.snapshotId : null as number | null,
          stats: built.stats,
          failures: built.failures,
          nPerSpec,
          dropped: built.preSpec?.dropped,
          partialOutcome: decision.outcome,
        }
      }
      const stagedPartial = writeStagedMetaSnapshot(input.sqlite, built.payload, clock())
      const promotedPartial = promoteMetaSnapshot(input.sqlite, stagedPartial.snapshotId, built.payload.region, clock())
      const purgePartial = input.purgeMeta ?? purgeCloudflareMeta
      await purgePartial()
      return {
        status: 'partial' as const,
        reason: 'Meta nightly hit the job deadline; published partial snapshot',
        snapshotId: promotedPartial.snapshotId,
        stats: built.stats,
        failures: built.failures,
        nPerSpec,
        dropped: built.preSpec?.dropped,
        partialOutcome: 'published' as const,
      }
    }
    const staged = writeStagedMetaSnapshot(input.sqlite, built.payload, clock())
    const plannedProfiles = Math.max(built.failures.attempted, built.payload.sampled.profiles)
    const policy = evaluateMetaRunPolicy({
      plannedProfiles,
      successfulProfiles: built.payload.sampled.profiles,
      stats: built.stats,
      payload: built.payload,
      previous: previous?.payload ?? null,
    })
    const leaderboardRatio = built.leaderboards.planned > 0
      ? built.leaderboards.ok / built.leaderboards.planned
      : 1
    const reasons = [...policy.reasons]
    if (leaderboardRatio < 0.9) reasons.push(`leaderboards ${built.leaderboards.ok}/${built.leaderboards.planned} below 0.9`)
    if (reasons.length) {
      return {
        status: 'partial' as const,
        reason: reasons.join('; '),
        snapshotId: previous?.snapshotId ?? null as number | null,
        stats: built.stats,
        failures: built.failures,
        nPerSpec,
        dropped: built.preSpec?.dropped,
        partialOutcome: (previous ? 'kept-last-good' : 'not-published') as MetaPartialOutcome,
      }
    }
    const promoted = promoteMetaSnapshot(input.sqlite, staged.snapshotId, built.payload.region, clock())
    const purge = input.purgeMeta ?? purgeCloudflareMeta
    await purge()
    return {
      status: 'ok' as const,
      reason: undefined as string | undefined,
      snapshotId: promoted.snapshotId,
      stats: built.stats,
      failures: built.failures,
      nPerSpec,
      dropped: built.preSpec?.dropped,
    }
    } catch (error) {
      if (!isMetaHeapGuardError(error) && !isMetaDeadlineError(error)) throw error
      return {
        status: 'error' as const,
        reason: error instanceof Error ? error.message : 'Meta update failed',
        snapshotId: null as number | null,
        stats: undefined,
        failures: undefined,
        nPerSpec: null,
        dropped: undefined,
      }
    }
  }, clock, deadline)

  if (!locked.ok) return finish('locked', 'A Meta update is already running')
  const value = locked.value
  return finish(value.status, value.reason, value.snapshotId, value.stats, value.failures, value.nPerSpec, value.dropped, value.partialOutcome)
}

export async function runScheduledBlizzardMetaSyncGuarded(input: Parameters<typeof runScheduledBlizzardMetaSync>[0]): Promise<ScheduledMetaResult> {
  try {
    return await runScheduledBlizzardMetaSync(input)
  } catch (err) {
    const secrets = [
      typeof input.config.blizzardClientId === 'string' ? input.config.blizzardClientId : '',
      typeof input.config.blizzardClientSecret === 'string' ? input.config.blizzardClientSecret : '',
    ]
    const reason = sanitizeBlizzardLog(err instanceof Error ? err.message : 'Meta update failed', secrets)
    console.error(`[blizzard:nightly] ${reason}`)
    recordMetaRun(input.sqlite, {
      startedAt: asClock(input.now)(),
      status: 'error',
      reason,
    })
    const push = input.kumaPush ?? pushMetaKuma
    await push(input.config.metaKumaPushUrl, 'down', reason)
    return { status: 'error', reason }
  }
}
