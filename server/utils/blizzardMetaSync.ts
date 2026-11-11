/**
 * EU Mythic+ Meta snapshot: M+ leaderboards → popular specs, then a capped
 * sample of character specializations/equipment for talents and gear.
 * All HTTP goes through an injected fetcher (no network in tests).
 */

import {
  findMetaClass,
  lookupBlizzardSpec,
  toMetaSlug,
} from '~/utils/metaCatalog'
import {
  META_FOCUS,
  META_REGION,
  type MetaSnapshotPayload,
} from '~/utils/metaTypes'
import {
  absorbProfile,
  buildClassSummaries,
  emptyProfileBucket,
  playableClassName,
  type ProfileBucket,
  type SpecPop,
} from './blizzardMetaAggregate'
import {
  BLIZZARD_TOKEN_URL,
  basicAuthHeader,
  getBlizzardAccessToken,
  sanitizeBlizzardLog,
  type BlizzardCredentials,
} from './blizzardAuth'
import { blizzardRequest, type BlizzardFetcher } from './blizzardHttp'
import {
  deleteExpiredMetaSnapshots,
  writeMetaSnapshot,
  type MetaSqlite,
} from './blizzardMetaStore'
import { withBlizzardMetaLock } from './blizzardMetaLock'
import {
  blizzardMetaNightlyFromRuntimeConfig,
} from '~/utils/metaSchedule'
import { blizzardCredentialsFromConfig } from './blizzardAuth'

export const META_SYNC_CAPS = {
  maxRealms: 8,
  maxLeaderboardEntries: 40,
  maxProfileFetches: 40,
} as const

const API_ROOT = 'https://eu.api.blizzard.com'
const DYNAMIC = 'dynamic-eu'
const PROFILE = 'profile-eu'
const LOCALE = 'en_GB'

type SyncOptions = {
  fetcher: BlizzardFetcher
  credentials: BlizzardCredentials
  sleep?: (ms: number) => Promise<void>
  now?: number
  caps?: Partial<typeof META_SYNC_CAPS>
}

type CharacterKey = {
  realm: string
  name: string
  className: string
  specName: string
  keystoneLevel: number
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
  const match = href.match(/connected-realm\/(\d+)/i)
  return match ? Number(match[1]) : null
}

async function blizzardGet(
  fetcher: BlizzardFetcher,
  token: string,
  url: string,
  secrets: readonly string[],
  sleep?: (ms: number) => Promise<void>,
  now?: number,
): Promise<unknown> {
  const res = await blizzardRequest(fetcher, {
    method: 'GET',
    url,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'MagguuUI-Website/meta',
    },
  }, { sleep, now, secrets })
  return res.body
}

export async function buildMetaSnapshot(options: SyncOptions): Promise<MetaSnapshotPayload> {
  const caps = { ...META_SYNC_CAPS, ...options.caps }
  const now = options.now ?? Date.now()
  const secrets = [options.credentials.id, options.credentials.secret]
  const requestToken = async (credentials: BlizzardCredentials) => {
    const res = await blizzardRequest(options.fetcher, {
      method: 'POST',
      url: BLIZZARD_TOKEN_URL,
      headers: {
        Authorization: basicAuthHeader(credentials),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'MagguuUI-Website/meta',
      },
      body: 'grant_type=client_credentials',
    }, { sleep: options.sleep, now, secrets })
    return (asRecord(res.body) ?? {}) as { access_token?: unknown, expires_in?: unknown }
  }

  let token: string
  try {
    token = await getBlizzardAccessToken(options.credentials, requestToken, now)
  } catch (err) {
    throw new Error(sanitizeBlizzardLog(err instanceof Error ? err.message : 'token failed', secrets), { cause: err })
  }

  const get = (path: string, query = `namespace=${DYNAMIC}&locale=${LOCALE}`) =>
    blizzardGet(options.fetcher, token, `${API_ROOT}${path}${path.includes('?') ? '' : `?${query}`}`, secrets, options.sleep, now)

  const seasonIndex = asRecord(await get('/data/wow/mythic-keystone/season/index'))
  const currentSeason = asRecord(seasonIndex?.current_season)
  const seasonId = asNumber(currentSeason?.id)
  const seasonBody = seasonId != null ? asRecord(await get(`/data/wow/mythic-keystone/season/${seasonId}`)) : null
  const seasonName = asString(seasonBody?.name) || (seasonId != null ? `Season ${seasonId}` : '')

  const periodIndex = asRecord(await get('/data/wow/mythic-keystone/period/index'))
  const periodId = asNumber(asRecord(periodIndex?.current_period)?.id)

  const realmIndex = asRecord(await get('/data/wow/connected-realm/index'))
  const realmIds = asArray(realmIndex?.connected_realms)
    .map((item) => idFromHref(asString(asRecord(item)?.href)))
    .filter((id): id is number => id != null)
    .sort((a, b) => a - b)
    .slice(0, caps.maxRealms)

  const characters = new Map<string, CharacterKey>()
  let leaderboardsFetched = 0
  let dungeonIds: number[] = []

  for (const realmId of realmIds) {
    const boardIndex = asRecord(await get(`/data/wow/connected-realm/${realmId}/mythic-leaderboard/index`))
    const boards = asArray(boardIndex?.current_leaderboards)
    if (!dungeonIds.length) {
      dungeonIds = boards
        .map(board => asNumber(asRecord(asRecord(board)?.map || asRecord(board)?.keystone_map)?.id))
        .filter((id): id is number => id != null)
    }
    const periodForBoard = periodId ?? asNumber(asRecord(asRecord(boards[0])?.period)?.id)
    if (periodForBoard == null) continue
    const dungeons = dungeonIds.length
      ? dungeonIds
      : boards.map(board => asNumber(asRecord(asRecord(board)?.map || asRecord(board)?.keystone_map)?.id)).filter((id): id is number => id != null)
    for (const dungeonId of dungeons) {
      const board = asRecord(await get(`/data/wow/connected-realm/${realmId}/mythic-leaderboard/${dungeonId}/period/${periodForBoard}`))
      leaderboardsFetched += 1
      const groups = asArray(board?.leading_groups).slice(0, caps.maxLeaderboardEntries)
      for (const group of groups) {
        const level = asNumber(asRecord(group)?.keystone_level) ?? 0
        for (const member of asArray(asRecord(group)?.members)) {
          const rec = asRecord(member)
          const profile = asRecord(rec?.profile)
          const realm = toMetaSlug(asString(asRecord(profile?.realm)?.slug) || asString(asRecord(profile?.realm)?.name))
          const name = asString(profile?.name)
          if (!realm || !name) continue
          const specRec = asRecord(rec?.specialization)
          const looked = lookupBlizzardSpec(
            asNumber(specRec?.id) ?? -1,
            asString(specRec?.name) || undefined,
          )
          if (!looked || !findMetaClass(toMetaSlug(looked.className))) continue
          const key = `${realm}/${name.toLowerCase()}`
          const existing = characters.get(key)
          if (!existing || level > existing.keystoneLevel) {
            characters.set(key, {
              realm,
              name,
              className: looked.className,
              specName: looked.specName,
              keystoneLevel: level,
            })
          }
        }
      }
    }
  }

  const allCharacters = [...characters.values()]
  const specPop = new Map<string, SpecPop>()
  const allKeyLevels: number[] = []
  for (const character of allCharacters) {
    const key = `${character.className}|${character.specName}`
    const current = specPop.get(key)
    if (current) {
      current.count += 1
      current.keyLevels.push(character.keystoneLevel)
    } else {
      specPop.set(key, {
        className: character.className,
        specName: character.specName,
        count: 1,
        keyLevels: [character.keystoneLevel],
      })
    }
    if (character.keystoneLevel > 0) allKeyLevels.push(character.keystoneLevel)
  }

  const profileTargets = pickProfileSample(allCharacters, caps.maxProfileFetches)
  const profileBySpec = new Map<string, ProfileBucket>()

  for (const target of profileTargets) {
    const base = `/profile/wow/character/${encodeURIComponent(target.realm)}/${encodeURIComponent(target.name.toLowerCase())}`
    const query = `namespace=${PROFILE}&locale=${LOCALE}`
    let specsBody: unknown
    let equipBody: unknown
    let characterBody: unknown
    try {
      specsBody = await get(`${base}/specializations`, query)
      equipBody = await get(`${base}/equipment`, query)
      try {
        characterBody = await get(base, query)
      } catch {
        characterBody = null
      }
    } catch {
      continue
    }
    const specsRec = specsBody && typeof specsBody === 'object' ? specsBody as Record<string, unknown> : null
    const active = specsRec && typeof specsRec.active_specialization === 'object'
      ? specsRec.active_specialization as Record<string, unknown>
      : specsRec && typeof specsRec.specialization === 'object'
        ? specsRec.specialization as Record<string, unknown>
        : null
    const looked = lookupBlizzardSpec(
      typeof active?.id === 'number' ? active.id : -1,
      typeof active?.name === 'string' ? active.name : target.specName,
      playableClassName(specsBody, target.className),
    ) || { className: target.className, specName: target.specName }
    const specKey = `${looked.className}|${looked.specName}`
    let bucket = profileBySpec.get(specKey)
    if (!bucket) {
      bucket = emptyProfileBucket()
      profileBySpec.set(specKey, bucket)
    }
    absorbProfile(bucket, { specsBody, equipmentBody: equipBody, characterBody })
  }

  const totalCharacters = allCharacters.length
  const classes = buildClassSummaries(specPop, profileBySpec, totalCharacters)
  const keyMin = allKeyLevels.length ? Math.min(...allKeyLevels) : null
  const keyMax = allKeyLevels.length ? Math.max(...allKeyLevels) : null

  return {
    region: META_REGION,
    focus: META_FOCUS,
    season: seasonId != null ? { id: seasonId, name: seasonName } : null,
    period: periodId != null ? { id: periodId } : null,
    freshness: {
      fetchedAt: Math.floor(now / 1000),
      characters: totalCharacters,
      keyLevels: keyMin != null && keyMax != null ? { min: keyMin, max: keyMax } : null,
      region: META_REGION,
      source: 'blizzard',
    },
    sampled: {
      realms: realmIds.length,
      leaderboards: leaderboardsFetched,
      characters: totalCharacters,
      profiles: profileTargets.length,
    },
    classes,
  }
}

function pickProfileSample(characters: CharacterKey[], max: number): CharacterKey[] {
  const bySpec = new Map<string, CharacterKey[]>()
  for (const character of characters) {
    const key = `${character.className}|${character.specName}`
    const list = bySpec.get(key) ?? []
    list.push(character)
    bySpec.set(key, list)
  }
  for (const list of bySpec.values()) {
    list.sort((a, b) => b.keystoneLevel - a.keystoneLevel || a.name.localeCompare(b.name))
  }
  const picked: CharacterKey[] = []
  const seen = new Set<string>()
  const specs = [...bySpec.entries()].sort((a, b) => b[1].length - a[1].length)
  let round = 0
  while (picked.length < max) {
    let added = false
    for (const [, list] of specs) {
      const next = list[round]
      if (!next) continue
      const key = `${next.realm}/${next.name.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      picked.push(next)
      added = true
      if (picked.length >= max) break
    }
    if (!added) break
    round += 1
  }
  return picked
}

export type ScheduledMetaResult = {
  status: 'ok' | 'skipped' | 'locked' | 'error'
  reason?: string
}

export async function runScheduledBlizzardMetaSync(input: {
  sqlite: MetaSqlite
  config: { blizzardMetaNightly?: unknown, blizzardClientId?: unknown, blizzardClientSecret?: unknown }
  fetcher: BlizzardFetcher
  sleep?: (ms: number) => Promise<void>
  now?: number
  nodeEnv?: string
  warn?: (message: string) => void
}): Promise<ScheduledMetaResult> {
  const now = input.now ?? Date.now()
  if (!blizzardMetaNightlyFromRuntimeConfig(input.config, input.nodeEnv, input.warn)) {
    return { status: 'skipped', reason: 'Disabled (NUXT_BLIZZARD_META_NIGHTLY is off)' }
  }
  const credentials = blizzardCredentialsFromConfig(input.config)
  if (!credentials) {
    return { status: 'skipped', reason: 'Disabled (NUXT_BLIZZARD_CLIENT_ID / NUXT_BLIZZARD_CLIENT_SECRET missing)' }
  }
  const locked = await withBlizzardMetaLock(async () => {
    deleteExpiredMetaSnapshots(input.sqlite, now)
    const payload = await buildMetaSnapshot({
      fetcher: input.fetcher,
      credentials,
      sleep: input.sleep,
      now,
    })
    writeMetaSnapshot(input.sqlite, payload, now)
    return payload
  }, now)
  if (!locked.ok) return { status: 'locked', reason: 'A Meta update is already running' }
  return { status: 'ok' }
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
    return { status: 'error', reason }
  }
}
