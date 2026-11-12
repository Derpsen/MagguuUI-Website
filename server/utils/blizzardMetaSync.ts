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
  emptyProfileBucket,
  extractActiveLoadouts,
  extractMediaIcon,
  knownIdsFromTalentLayout,
  parseTalentTreeLayout,
  playableClassName,
  serializeProfileBucket,
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
import { evaluateMetaRunPolicy } from './blizzardMetaPolicy'
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
}

export const META_SYNC_DEFAULT_CAPS: MetaSyncCaps = {
  samplePerSpec: 200,
  maxAttemptsPerSpec: 400,
  maxRps: META_MAX_RPS,
  concurrency: META_CONCURRENCY,
  maxRealms: 0,
  periods: META_PREVIOUS_PERIODS + 1,
  maxConcurrentSpecs: 1,
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

export type ScheduledMetaResult = {
  status: MetaRunStatus
  reason?: string
  snapshotId?: number | null
  http429?: number
  specsWithData?: number
  durationMs?: number
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

/** Compact per-player table for leaderboard ingest.
 *  A Map of object values retains the parsed board graph (EU-scale fixture:
 *  166k players → ~440 MB live). Parallel arrays stay around 70 MB. */
class MetaCandidateTable {
  private readonly index = new Map<string, number>()
  private readonly realms: string[] = []
  private readonly names: string[] = []
  private readonly specIds: number[][] = []
  private readonly runs: number[][] = []
  private readonly bests: number[][] = []

  get size() {
    return this.names.length
  }

  add(realm: string, name: string, specId: number, level: number) {
    const key = `${realm}/${name}`
    let i = this.index.get(key)
    if (i == null) {
      i = this.names.length
      this.index.set(key, i)
      this.realms.push(realm)
      this.names.push(name)
      this.specIds.push([specId])
      this.runs.push([1])
      this.bests.push([level])
      return
    }
    const ids = this.specIds[i]!
    const pos = ids.indexOf(specId)
    if (pos < 0) {
      ids.push(specId)
      this.runs[i]!.push(1)
      this.bests[i]!.push(level)
      return
    }
    this.runs[i]![pos]! += 1
    if (level > this.bests[i]![pos]!) this.bests[i]![pos] = level
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

  clear() {
    this.index.clear()
    this.realms.length = 0
    this.names.length = 0
    this.specIds.length = 0
    this.runs.length = 0
    this.bests.length = 0
  }
}


function dungeonIdOf(board: unknown): number | null {
  const rec = asRecord(board)
  return asNumber(rec?.id)
    ?? asNumber(asRecord(rec?.map)?.id)
    ?? asNumber(asRecord(rec?.keystone_map)?.id)
}

function mergeCaps(partial?: Partial<MetaSyncCaps>): MetaSyncCaps {
  const caps = { ...META_SYNC_DEFAULT_CAPS, ...partial }
  caps.maxRps = Math.min(Math.max(1, caps.maxRps), 50)
  caps.maxAttemptsPerSpec = Math.max(caps.maxAttemptsPerSpec, caps.samplePerSpec)
  caps.periods = Math.max(1, caps.periods)
  caps.maxConcurrentSpecs = Math.min(Math.max(1, caps.maxConcurrentSpecs), 8)
  return caps
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
    if (syncAborted(abort)) return null
    assertDeadline(options.deadline, now)
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
        if (abort && !abort.signal.aborted) abort.abort()
        throw error
      }
    }
  }
  const results = await Promise.allSettled(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => run()))
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (rejected) throw rejected.reason
}

function tripAbort(abort: AbortController, error: unknown): never {
  if (!abort.signal.aborted) abort.abort()
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
}

export async function buildMetaSnapshot(options: SyncOptions): Promise<{
  payload: MetaSnapshotPayload
  stats: BlizzardHttpStats
  failures: ProfileFailures
  leaderboards: { planned: number, ok: number, failed: number }
  preSpec?: MetaPreSpecStats
}> {
  const caps = mergeCaps(options.caps)
  const clock = asClock(options.now)
  const now = clock()
  const stats = options.stats ?? createBlizzardHttpStats()
  const traffic = options.traffic ?? createBlizzardTraffic({
    maxRps: caps.maxRps,
    concurrency: caps.concurrency,
    sleep: options.sleep,
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
  const periodIds = (seasonPeriodIds.length ? seasonPeriodIds : [currentPeriodId]).slice(0, caps.periods)
  const periods = {
    current: { id: currentPeriodId },
    included: periodIds.map(id => ({ id })),
  }

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

  const candidates = new MetaCandidateTable()
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

  const perSpec = new Map<number, CharacterCandidate[]>()
  const specPop = new Map<string, SpecPop>()
  const allKeyLevels: number[] = []
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
    const popKey = `${meta.className}|${meta.specName}`
    const pop = specPop.get(popKey) ?? { className: meta.className, specName: meta.specName, count: 0, keyLevels: [] }
    pop.count += 1
    if (assigned.best > 0) {
      pop.keyLevels.push(assigned.best)
      allKeyLevels.push(assigned.best)
    }
    specPop.set(popKey, pop)
  }
  let retained = 0
  for (const list of perSpec.values()) {
    list.sort((a, b) => b.best - a.best || b.runs - a.runs)
    if (list.length > caps.maxAttemptsPerSpec) list.length = caps.maxAttemptsPerSpec
    retained += list.length
  }
  const totalCharacters = [...specPop.values()].reduce((sum, pop) => sum + pop.count, 0)
  const candidateCount = candidates.size
  const preSpec: MetaPreSpecStats = {
    realms: realmIds.length,
    dungeons: dungeonIds.length,
    periods: periodIds.length,
    planned: jobs.length,
    ok: leaderboardsOk,
    failed: leaderboardsFailed,
    candidates: candidateCount,
    retained,
  }

  runGuards(abort, options.deadline, asClock(options.now), heap)
  if (syncAborted(abort)) throw new Error('Meta nightly aborted')
  writeMetaSyncRunContext(staging.sqlite, runToken, {
    season: { id: seasonId, label: seasonLabel },
    periods,
    realmCount: realmIds.length,
    leaderboards: { planned: jobs.length, ok: leaderboardsOk, failed: leaderboardsFailed },
    specPop: [...specPop.values()],
    totalCharacters,
    allKeyLevels,
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
          keyLevels: minMax(allKeyLevels),
          region: META_REGION,
          source: 'blizzard',
        },
        basis: {
          region: META_REGION,
          focus: META_FOCUS,
          season: { id: seasonId, label: seasonLabel },
          periods,
          talentTree: null,
          keyLevels: minMax(allKeyLevels),
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

  const specIds = [...perSpec.keys()]
  await mapPool(specIds, caps.maxConcurrentSpecs, async (specId) => {
    if (syncAborted(abort)) return
    runGuards(abort, options.deadline, asClock(options.now), heap)
    const list = perSpec.get(specId) ?? []
    const meta = specMeta.get(specId) || (list[0] ? { className: list[0].className, specName: list[0].specName, treeHref: null as string | null } : null)
    if (!meta) {
      perSpec.delete(specId)
      return
    }

    let layout = null
    const href = specMeta.get(specId)?.treeHref
    const match = href?.match(/talent-tree\/(\d+)\/playable-specialization\/(\d+)/)
    if (match) {
      if (syncAborted(abort)) return
      const body = await get(`/data/wow/talent-tree/${match[1]}/playable-specialization/${match[2]}`, STATIC)
      layout = parseTalentTreeLayout(body, specId)
    }
    const known = layout ? knownIdsFromTalentLayout(layout) : undefined

    const bucketsByHash = new Map<string, ProfileBucket>()
    const versionsByHash: Record<string, number[]> = {}
    for (let i = 0; i < list.length && (bucketsByHash.size ? [...bucketsByHash.values()].reduce((sum, bucket) => sum + bucket.profiles, 0) : 0) < caps.samplePerSpec && i < caps.maxAttemptsPerSpec; i++) {
      if (syncAborted(abort)) return
      runGuards(abort, options.deadline, asClock(options.now), heap)
      const target = list[i]!
      failures.attempted += 1
      try {
        const base = `/profile/wow/character/${encodeURIComponent(target.realm)}/${encodeURIComponent(target.name)}`
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
        if (syncAborted(abort)) return
        const specsBody = await get(`${base}/specializations`, PROFILE)
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
      } catch {
        failures.exceptions += 1
      }
    }

    if (syncAborted(abort)) return
    writeMetaSyncSpecAggregate(staging.sqlite, runToken, {
      specId,
      className: meta.className,
      specName: meta.specName,
      bucketsByHash: Object.fromEntries([...bucketsByHash.entries()].map(([hash, bucket]) => [hash, serializeProfileBucket(bucket)])),
      versionsByHash,
      layout,
    })
    bucketsByHash.clear()
    perSpec.delete(specId)
  }, abort)

  if (syncAborted(abort)) throw new Error('Meta nightly aborted')
  runGuards(abort, options.deadline, asClock(options.now), heap)
  const context = readMetaSyncRunContext(staging.sqlite, runToken)
  if (!context) throw new Error('Meta nightly staging context was missing')
  const stagedSpecs = readMetaSyncSpecAggregates(staging.sqlite, runToken)
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
    failures.outdatedTree += dropped
    if (current) {
      for (const version of stage.versionsByHash[current] ?? []) versions.push(version)
    }
    unknownTalentNodes += profileBySpec.get(key)!.unknownTalentNodes
  }

  const classes = buildClassSummaries(specPopFromStage, profileBySpec, context.totalCharacters)
  attachSpecLayouts(classes, layouts)

  const itemIds = collectItemIds(classes)
  const itemIcons = new Map<number, string>()
  await mapPool(itemIds, caps.concurrency, async (id) => {
    if (syncAborted(abort)) return
    const icon = extractMediaIcon(await get(`/data/wow/media/item/${id}`, STATIC))
    if (icon) itemIcons.set(id, icon)
  }, abort)
  applyItemIcons(classes, itemIcons)

  const spellIds = collectSpellIds(classes)
  const spellIcons = new Map<number, string>()
  await mapPool(spellIds, caps.concurrency, async (id) => {
    if (syncAborted(abort)) return
    const icon = extractMediaIcon(await get(`/data/wow/media/spell/${id}`, STATIC))
    if (icon) spellIcons.set(id, icon)
  }, abort)
  applySpellIcons(classes, spellIcons)
  if (syncAborted(abort)) throw new Error('Meta nightly aborted')

  const hashes = [...new Set(currentHashByClass.values())]
  const version = versions.sort((a, b) => versions.filter(v => v === b).length - versions.filter(v => v === a).length)[0]
  const talentTree: MetaTalentTreeState | null = hashes.length === 1
    ? { hash: hashes[0]!, build: version != null ? String(version) : null }
    : { hash: null, build: version != null ? String(version) : null }

  const successfulProfiles = [...profileBySpec.values()].reduce((sum, bucket) => sum + bucket.profiles, 0)
  const keyLevels = minMax(context.allKeyLevels)
  const fetchedAt = Math.floor(now / 1000)
  const season = context.season
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
      realms: realmIds.length,
      leaderboards: leaderboardsOk,
      players: context.totalCharacters,
      profiles: successfulProfiles,
      skipped404: failures.notFound,
      specMismatch: failures.specMismatch,
      unknownTalentNodes,
    },
    classes,
  }

  clearMetaSyncStaging(staging.sqlite, runToken)
  return {
    payload,
    stats,
    failures,
    leaderboards: context.leaderboards,
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
  const finish = async (status: MetaRunStatus, reason?: string, snapshotId?: number | null, stats?: BlizzardHttpStats, failures?: ProfileFailures, nPerSpec?: Record<string, number> | null) => {
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
      deadline,
      sqlite: input.sqlite,
      heap: input.heap,
      runToken: `meta-sync-${startedAt}`,
      abortController: input.abortController,
    })
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
    const nPerSpec: Record<string, number> = {}
    for (const cls of built.payload.classes) {
      for (const spec of cls.specs) nPerSpec[`${cls.slug}/${spec.slug}`] = spec.n
    }
    if (reasons.length) {
      return {
        status: 'partial' as const,
        reason: reasons.join('; '),
        snapshotId: null as number | null,
        stats: built.stats,
        failures: built.failures,
        nPerSpec,
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
    }
    } catch (error) {
      if (!isMetaHeapGuardError(error)) throw error
      return {
        status: 'error' as const,
        reason: error.message,
        snapshotId: null as number | null,
        stats: undefined,
        failures: undefined,
        nPerSpec: null,
      }
    }
  }, clock, deadline)

  if (!locked.ok) return finish('locked', 'A Meta update is already running')
  const value = locked.value
  return finish(value.status, value.reason, value.snapshotId, value.stats, value.failures, value.nPerSpec)
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
