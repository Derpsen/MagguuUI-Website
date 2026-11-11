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
  emptyProfileBucket,
  extractActiveLoadouts,
  extractMediaIcon,
  knownIdsFromTalentLayout,
  parseTalentTreeLayout,
  playableClassName,
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
  deleteExpiredMetaSnapshots,
  promoteMetaSnapshot,
  readCurrentMetaSnapshot,
  recordMetaRun,
  writeStagedMetaSnapshot,
  type MetaRunStatus,
  type MetaSqlite,
} from './blizzardMetaStore'
import { purgeCloudflareMeta } from './cloudflarePurge'
import { kumaStatusForMetaRun, pushMetaKuma } from './metaKuma'

export type MetaSyncCaps = {
  samplePerSpec: number
  maxAttemptsPerSpec: number
  maxRps: number
  concurrency: number
  maxRealms: number
  periods: number
}

export const META_SYNC_DEFAULT_CAPS: MetaSyncCaps = {
  samplePerSpec: 200,
  maxAttemptsPerSpec: 400,
  maxRps: META_MAX_RPS,
  concurrency: META_CONCURRENCY,
  maxRealms: 0,
  periods: META_PREVIOUS_PERIODS + 1,
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
  now?: number
  caps?: Partial<MetaSyncCaps>
  deadline?: number
  stats?: BlizzardHttpStats
  traffic?: BlizzardTraffic
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

type RawProfile = {
  className: string
  specName: string
  specId: number
  specsBody: unknown
  equipmentBody: unknown
  characterBody: unknown
  treeHash: string
  code: string
  version: number
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

function idFromHref(href: string): number | null {
  const match = href.match(/connected-realm\/(\d+)/i) || href.match(/\/(\d+)(?:\?|$)/)
  return match ? Number(match[1]) : null
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
  return caps
}

function assertDeadline(deadline: number | undefined, now: () => number) {
  if (deadline != null && now() >= deadline) throw new Error('Meta nightly hit the job deadline')
}

async function requestToken(
  fetcher: BlizzardFetcher,
  credentials: BlizzardCredentials,
  options: { sleep?: (ms: number) => Promise<void>, now?: number, stats?: BlizzardHttpStats, traffic?: BlizzardTraffic },
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
) {
  let token = ''
  const now = () => options.now ?? Date.now()
  const refresh = async (force = false) => {
    if (force) resetBlizzardAccessTokenCache()
    token = await getBlizzardAccessToken(
      options.credentials,
      creds => requestToken(options.fetcher, creds, { sleep: options.sleep, now: now(), stats, traffic }),
      now(),
    )
    return token
  }

  const get = async (path: string, namespace: string, soft = true): Promise<unknown> => {
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

export async function buildMetaSnapshot(options: SyncOptions): Promise<{
  payload: MetaSnapshotPayload
  stats: BlizzardHttpStats
  failures: ProfileFailures
  leaderboards: { planned: number, ok: number, failed: number }
}> {
  const caps = mergeCaps(options.caps)
  const now = options.now ?? Date.now()
  const stats = options.stats ?? createBlizzardHttpStats()
  const traffic = options.traffic ?? createBlizzardTraffic({
    maxRps: caps.maxRps,
    concurrency: caps.concurrency,
    sleep: options.sleep,
    now: () => options.now ?? Date.now(),
  })
  const secrets = [options.credentials.id, options.credentials.secret]
  const { get } = createGetter(options, stats, traffic, secrets)
  const failures: ProfileFailures = {
    notFound: 0, other: 0, specMismatch: 0, noLoadout: 0,
    badLoadoutCode: 0, outdatedTree: 0, exceptions: 0, attempted: 0,
  }

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

  const candidates = new Map<string, { realm: string, name: string, specs: Record<number, { runs: number, best: number }> }>()
  const specRuns = new Map<number, { appearances: number, levels: number[] }>()
  const runsSeen = new Set<string>()
  let leaderboardsOk = 0
  let leaderboardsFailed = 0

  await Promise.all(jobs.map(async ([realmId, dungeonId, periodId]) => {
    const board = asRecord(await get(`/data/wow/connected-realm/${realmId}/mythic-leaderboard/${dungeonId}/period/${periodId}`, DYNAMIC))
    if (!board) {
      leaderboardsFailed += 1
      return
    }
    leaderboardsOk += 1
    for (const rawGroup of asArray(board.leading_groups)) {
      const group = asRecord(rawGroup)
      if (!group) continue
      const level = asNumber(group.keystone_level) ?? 0
      const members = asArray(group.members)
      const memberIds = members.map((member) => {
        const rec = asRecord(member)
        return asNumber(asRecord(rec?.profile)?.id) ?? 0
      }).sort((a, b) => a - b)
      const runKey = `${dungeonId}:${asNumber(group.completed_timestamp) ?? 0}:${asNumber(group.duration) ?? 0}:${memberIds.join(',')}`
      const dup = runsSeen.has(runKey)
      runsSeen.add(runKey)
      for (const rawMember of members) {
        const rec = asRecord(rawMember)
        const profile = asRecord(rec?.profile)
        const realm = toMetaSlug(asString(asRecord(profile?.realm)?.slug) || asString(asRecord(profile?.realm)?.name))
        const name = asString(profile?.name).toLowerCase()
        if (!realm || !name) continue
        const specRec = asRecord(rec?.specialization)
        const specId = asNumber(specRec?.id)
        if (specId == null) continue
        if (!dup) {
          const current = specRuns.get(specId) ?? { appearances: 0, levels: [] }
          current.appearances += 1
          current.levels.push(level)
          specRuns.set(specId, current)
        }
        const key = `${realm}/${name}`
        const candidate = candidates.get(key) ?? { realm, name, specs: {} }
        const slot = candidate.specs[specId] ?? { runs: 0, best: 0 }
        slot.runs += 1
        slot.best = Math.max(slot.best, level)
        candidate.specs[specId] = slot
        candidates.set(key, candidate)
      }
    }
  }))

  const specIndex = asRecord(await get('/data/wow/playable-specialization/index', STATIC))
  const specMeta = new Map<number, { className: string, specName: string, treeHref: string | null }>()
  await Promise.all(asArray(specIndex?.character_specializations).map(async (item) => {
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
  }))

  const perSpec = new Map<number, CharacterCandidate[]>()
  const specPop = new Map<string, SpecPop>()
  const allKeyLevels: number[] = []
  for (const candidate of candidates.values()) {
    const assigned = Object.entries(candidate.specs)
      .map(([id, slot]) => ({ specId: Number(id), ...slot }))
      .sort((a, b) => b.runs - a.runs || b.best - a.best)[0]
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
  for (const list of perSpec.values()) list.sort((a, b) => b.best - a.best || b.runs - a.runs)
  const totalCharacters = [...specPop.values()].reduce((sum, pop) => sum + pop.count, 0)

  const samples = new Map<number, RawProfile[]>()
  await Promise.all([...perSpec.entries()].map(async ([specId, list]) => {
    const kept: RawProfile[] = []
    for (let i = 0; i < list.length && kept.length < caps.samplePerSpec && i < caps.maxAttemptsPerSpec; i++) {
      assertDeadline(options.deadline, () => options.now ?? Date.now())
      const target = list[i]!
      failures.attempted += 1
      try {
        const base = `/profile/wow/character/${encodeURIComponent(target.realm)}/${encodeURIComponent(target.name)}`
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
        const specsBody = await get(`${base}/specializations`, PROFILE)
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
        kept.push({
          className: looked.className,
          specName: looked.specName,
          specId,
          specsBody,
          equipmentBody,
          characterBody: summary,
          treeHash: header.treeHash,
          code: loadout.code,
          version: header.version,
        })
      } catch {
        failures.exceptions += 1
      }
    }
    samples.set(specId, kept)
  }))

  const hashCount = new Map<string, number>()
  for (const [specId, list] of samples) {
    const className = specMeta.get(specId)?.className || list[0]?.className
    if (!className) continue
    for (const row of list) {
      const key = `${className}:${row.treeHash}`
      hashCount.set(key, (hashCount.get(key) ?? 0) + 1)
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
  for (const [specId, list] of samples) {
    const className = specMeta.get(specId)?.className || list[0]?.className
    const current = className ? currentHashByClass.get(className) : null
    if (!current) continue
    const kept = list.filter(row => row.treeHash === current)
    failures.outdatedTree += list.length - kept.length
    samples.set(specId, kept)
  }

  const layouts = new Map<string, MetaTalentLayout>()
  const knownBySpec = new Map<number, { nodes: Set<number>, talentIds: Set<number> }>()
  await Promise.all([...samples.keys()].map(async (specId) => {
    const href = specMeta.get(specId)?.treeHref
    const match = href?.match(/talent-tree\/(\d+)\/playable-specialization\/(\d+)/)
    if (!match) return
    const body = await get(`/data/wow/talent-tree/${match[1]}/playable-specialization/${match[2]}`, STATIC)
    const layout = parseTalentTreeLayout(body, specId)
    if (!layout) return
    const meta = specMeta.get(specId)
    if (meta) layouts.set(`${toMetaSlug(meta.className)}|${toMetaSlug(meta.specName)}`, layout)
    knownBySpec.set(specId, knownIdsFromTalentLayout(layout))
  }))

  const profileBySpec = new Map<string, ProfileBucket>()
  let unknownTalentNodes = 0
  for (const [specId, list] of samples) {
    const meta = specMeta.get(specId) || (list[0] ? { className: list[0].className, specName: list[0].specName } : null)
    if (!meta) continue
    const key = `${meta.className}|${meta.specName}`
    const bucket = profileBySpec.get(key) ?? emptyProfileBucket()
    const known = knownBySpec.get(specId)
    const className = meta.className
    const tree = currentHashByClass.get(className) ? { hash: currentHashByClass.get(className)!, build: null, nodeIds: known?.nodes ?? new Set() } : null
    for (const row of list) {
      absorbProfile(bucket, {
        specsBody: row.specsBody,
        equipmentBody: row.equipmentBody,
        characterBody: row.characterBody,
        tree,
        knownNodes: known?.nodes,
        knownTalentIds: known?.talentIds,
      })
    }
    unknownTalentNodes += bucket.unknownTalentNodes
    profileBySpec.set(key, bucket)
  }

  const classes = buildClassSummaries(specPop, profileBySpec, totalCharacters)
  attachSpecLayouts(classes, layouts)

  const itemIds = collectItemIds(classes)
  const itemIcons = new Map<number, string>()
  await Promise.all(itemIds.map(async (id) => {
    const icon = extractMediaIcon(await get(`/data/wow/media/item/${id}`, STATIC))
    if (icon) itemIcons.set(id, icon)
  }))
  applyItemIcons(classes, itemIcons)

  const spellIds = collectSpellIds(classes)
  const spellIcons = new Map<number, string>()
  await Promise.all(spellIds.map(async (id) => {
    const icon = extractMediaIcon(await get(`/data/wow/media/spell/${id}`, STATIC))
    if (icon) spellIcons.set(id, icon)
  }))
  applySpellIcons(classes, spellIcons)

  const hashes = [...new Set(currentHashByClass.values())]
  const versions = [...samples.values()].flatMap(list => list.map(row => row.version))
  const version = versions.sort((a, b) => versions.filter(v => v === b).length - versions.filter(v => v === a).length)[0]
  const talentTree: MetaTalentTreeState | null = hashes.length === 1
    ? { hash: hashes[0]!, build: version != null ? String(version) : null }
    : { hash: null, build: version != null ? String(version) : null }

  const successfulProfiles = [...samples.values()].reduce((sum, list) => sum + list.length, 0)
  const keyLevels = allKeyLevels.length ? { min: Math.min(...allKeyLevels), max: Math.max(...allKeyLevels) } : null
  const fetchedAt = Math.floor(now / 1000)
  const season = { id: seasonId, label: seasonLabel }
  const payload: MetaSnapshotPayload = {
    region: META_REGION,
    focus: META_FOCUS,
    season,
    periods,
    talentTree,
    freshness: {
      fetchedAt,
      players: totalCharacters,
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
      players: totalCharacters,
      profiles: successfulProfiles,
      source: 'blizzard',
    },
    sampled: {
      realms: realmIds.length,
      leaderboards: leaderboardsOk,
      players: totalCharacters,
      profiles: successfulProfiles,
      skipped404: failures.notFound,
      specMismatch: failures.specMismatch,
      unknownTalentNodes,
    },
    classes,
  }

  return {
    payload,
    stats,
    failures,
    leaderboards: { planned: jobs.length, ok: leaderboardsOk, failed: leaderboardsFailed },
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
  }
  fetcher: BlizzardFetcher
  sleep?: (ms: number) => Promise<void>
  now?: number
  nodeEnv?: string
  warn?: (message: string) => void
  caps?: Partial<MetaSyncCaps>
  kumaPush?: typeof pushMetaKuma
  purgeMeta?: typeof purgeCloudflareMeta
  deadline?: number
}): Promise<ScheduledMetaResult> {
  const now = input.now ?? Date.now()
  const startedAt = now
  const nightlyOn = metaNightlyFromRuntimeConfig(
    { metaNightly: input.config.metaNightly },
    input.nodeEnv,
    input.warn,
  )
  blizzardRegionFromRuntimeConfig(input.config, input.warn)
  const finish = async (status: MetaRunStatus, reason?: string, snapshotId?: number | null, stats?: BlizzardHttpStats, failures?: ProfileFailures, nPerSpec?: Record<string, number> | null) => {
    const record = recordMetaRun(input.sqlite, {
      startedAt,
      endedAt: input.now ?? Date.now(),
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
    return { status, reason, snapshotId: record.snapshotId }
  }

  const credentials = blizzardCredentialsFromConfig(input.config)
  if (!nightlyOn) {
    const locked = await withBlizzardMetaLock(async () => {
      deleteExpiredMetaSnapshots(input.sqlite, now)
    }, now)
    if (!locked.ok) return finish('locked', 'A Meta update is already running')
    return finish('skipped', 'Disabled (NUXT_META_NIGHTLY is off)')
  }
  if (!credentials) {
    return finish('skipped', 'Disabled (NUXT_BLIZZARD_CLIENT_ID / NUXT_BLIZZARD_CLIENT_SECRET missing)')
  }

  const sampleCaps = sampleCapsFromRuntimeConfig(input.config)
  const caps = mergeCaps({ ...sampleCaps, ...input.caps })
  const locked = await withBlizzardMetaLock(async () => {
    deleteExpiredMetaSnapshots(input.sqlite, now)
    const previous = readCurrentMetaSnapshot(input.sqlite, META_REGION, now)
    const built = await buildMetaSnapshot({
      fetcher: input.fetcher,
      credentials,
      sleep: input.sleep,
      now,
      caps,
      deadline: input.deadline ?? (now + META_JOB_TIMEOUT_MS),
    })
    const staged = writeStagedMetaSnapshot(input.sqlite, built.payload, now)
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
    const promoted = promoteMetaSnapshot(input.sqlite, staged.snapshotId, built.payload.region, now)
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
  }, now)

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
      startedAt: input.now ?? Date.now(),
      status: 'error',
      reason,
    })
    const push = input.kumaPush ?? pushMetaKuma
    await push(input.config.metaKumaPushUrl, 'down', reason)
    return { status: 'error', reason }
  }
}
