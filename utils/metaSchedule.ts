import { formatBerlinTime } from './githubSchedule'
import { META_MAX_ATTEMPTS_PER_SPEC, META_REGION, META_SAMPLE_PER_SPEC } from './metaTypes'

/**
 * Nightly Meta job clock: cron 03:15 UTC (after github:nightly at 02:30 UTC).
 * Admin/docs display in Europe/Berlin. UTC getters only — no container TZ.
 */

export const BLIZZARD_META_NIGHTLY_CRON = '15 3 * * *'
export const BLIZZARD_META_NIGHTLY_CRON_TZ = 'UTC'
export const BLIZZARD_META_NIGHTLY_DISPLAY_TZ = 'Europe/Berlin'

/** Next 03:15 UTC at or after `from` (if `from` is exactly 03:15:00.000Z, the following day). */
export function nextBlizzardMetaNightlyRun(from = new Date()): Date {
  const next = new Date(from.getTime())
  next.setUTCMilliseconds(0)
  next.setUTCSeconds(0)
  next.setUTCMinutes(15)
  next.setUTCHours(3)
  if (next.getTime() <= from.getTime()) next.setUTCDate(next.getUTCDate() + 1)
  return next
}

/**
 * Nightly Meta kill switch (NUXT_META_NIGHTLY / runtimeConfig.metaNightly).
 * Default: off in every environment until credentials exist and the flag is turned on.
 * Recognised values (case-insensitive, trimmed): on/true/1/yes = on,
 * off/false/0/no = off. Anything else logs a warning once per process and
 * uses the default (off). The string "false" must not be treated as on.
 */
let unknownMetaNightlyWarned = false
let unknownRegionWarned = false

/** Test-only: allow the once-per-process unknown-value warning to fire again. */
export function resetMetaNightlyFlagWarning() {
  unknownMetaNightlyWarned = false
}

export function parseMetaNightlyFlag(
  value: unknown,
  _nodeEnv = process.env.NODE_ENV,
  warn: (message: string) => void = console.warn,
): boolean {
  const defaultOn = false
  if (value == null || value === '') return defaultOn
  if (typeof value === 'boolean') return value
  const raw = String(value).trim().toLowerCase()
  if (raw === 'on' || raw === 'true' || raw === '1' || raw === 'yes') return true
  if (raw === 'off' || raw === 'false' || raw === '0' || raw === 'no') return false
  if (!unknownMetaNightlyWarned) {
    unknownMetaNightlyWarned = true
    warn(`[blizzard:nightly] NUXT_META_NIGHTLY=${JSON.stringify(String(value))} is not recognised; using default (${defaultOn ? 'on' : 'off'})`)
  }
  return defaultOn
}

export function isMetaNightlyEnabled(
  env: NodeJS.ProcessEnv = process.env,
  nodeEnv = env.NODE_ENV ?? process.env.NODE_ENV,
  warn: (message: string) => void = console.warn,
): boolean {
  return parseMetaNightlyFlag(env.NUXT_META_NIGHTLY, nodeEnv, warn)
}

/** Read the flag from Nitro runtimeConfig (the value Nuxt may override with a string). */
export function metaNightlyFromRuntimeConfig(
  config: { metaNightly?: unknown },
  nodeEnv = process.env.NODE_ENV,
  warn: (message: string) => void = console.warn,
): boolean {
  return parseMetaNightlyFlag(config.metaNightly, nodeEnv, warn)
}

/**
 * Phase 1 is EU only. Unknown or empty values become `eu`; anything else
 * warns once and still uses `eu`.
 */
export function parseBlizzardRegion(
  value: unknown,
  warn: (message: string) => void = console.warn,
): typeof META_REGION {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!raw || raw === META_REGION) return META_REGION
  if (!unknownRegionWarned) {
    unknownRegionWarned = true
    warn(`[blizzard:nightly] NUXT_BLIZZARD_REGION=${JSON.stringify(String(value))} is not supported in phase 1; using ${META_REGION}`)
  }
  return META_REGION
}

export function resetBlizzardRegionWarning() {
  unknownRegionWarned = false
}

export function blizzardRegionFromRuntimeConfig(
  config: { blizzardRegion?: unknown },
  warn: (message: string) => void = console.warn,
): typeof META_REGION {
  return parseBlizzardRegion(config.blizzardRegion, warn)
}

/**
 * The scheduler plugin must not arm the job in dev, CI, Playwright, or the
 * link-check prerender. Production still arms it when NUXT_META_NIGHTLY is
 * off so expired snapshots can be cleaned up.
 */
export function shouldArmMetaSchedule(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NUXT_E2E_SEED === 'true' || env.LINK_CHECK === '1') return false
  if (env.CI === 'true' || env.CI === '1') return false
  const nodeEnv = env.NODE_ENV ?? process.env.NODE_ENV
  if (nodeEnv === 'test' || nodeEnv === 'development') return false
  return true
}

/** Snapshot timestamps are stored as unix seconds and shown in Europe/Berlin. */
export function formatMetaFetchedAt(value: string | number | Date | null | undefined): string {
  return formatBerlinTime(value)
}


export function parsePositiveInt(value: unknown, fallback: number, min = 1, max = 1000): number {
  const n = typeof value === 'number' ? value : Number(typeof value === 'string' ? value.trim() : value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

/** Profile sample per spec. Default 200 (in the 150–200 range). */
export function parseMetaSamplePerSpec(value: unknown): number {
  return parsePositiveInt(value, META_SAMPLE_PER_SPEC, 1, 1000)
}

export function parseMetaMaxAttemptsPerSpec(value: unknown, sample = parseMetaSamplePerSpec(undefined)): number {
  return parsePositiveInt(value, Math.max(META_MAX_ATTEMPTS_PER_SPEC, sample * 2), 1, 4000)
}

export function parseMetaMaxConcurrentSpecs(value: unknown): number {
  return parsePositiveInt(value, 1, 1, 8)
}

export function sampleCapsFromRuntimeConfig(config: {
  metaSamplePerSpec?: unknown
  metaMaxAttemptsPerSpec?: unknown
  metaMaxConcurrentSpecs?: unknown
}): { samplePerSpec: number, maxAttemptsPerSpec: number, maxConcurrentSpecs: number } {
  const samplePerSpec = parseMetaSamplePerSpec(config.metaSamplePerSpec)
  const maxAttemptsPerSpec = parseMetaMaxAttemptsPerSpec(config.metaMaxAttemptsPerSpec, samplePerSpec)
  return {
    samplePerSpec,
    maxAttemptsPerSpec: Math.max(maxAttemptsPerSpec, samplePerSpec),
    maxConcurrentSpecs: parseMetaMaxConcurrentSpecs(config.metaMaxConcurrentSpecs),
  }
}
