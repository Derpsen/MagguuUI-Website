import { formatBerlinTime } from './githubSchedule'

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
 * Nightly Meta kill switch (NUXT_BLIZZARD_META_NIGHTLY / runtimeConfig.blizzardMetaNightly).
 * Default: off in every environment until credentials exist and the flag is turned on.
 * Recognised values (case-insensitive, trimmed): on/true/1/yes = on,
 * off/false/0/no = off. Anything else logs a warning once per process and
 * uses the default (off). The string "false" must not be treated as on.
 */
let unknownBlizzardMetaNightlyWarned = false

/** Test-only: allow the once-per-process unknown-value warning to fire again. */
export function resetBlizzardMetaNightlyFlagWarning() {
  unknownBlizzardMetaNightlyWarned = false
}

export function parseBlizzardMetaNightlyFlag(
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
  if (!unknownBlizzardMetaNightlyWarned) {
    unknownBlizzardMetaNightlyWarned = true
    warn(`[blizzard:nightly] NUXT_BLIZZARD_META_NIGHTLY=${JSON.stringify(String(value))} is not recognised; using default (${defaultOn ? 'on' : 'off'})`)
  }
  return defaultOn
}

export function isBlizzardMetaNightlyEnabled(
  env: NodeJS.ProcessEnv = process.env,
  nodeEnv = env.NODE_ENV ?? process.env.NODE_ENV,
  warn: (message: string) => void = console.warn,
): boolean {
  return parseBlizzardMetaNightlyFlag(env.NUXT_BLIZZARD_META_NIGHTLY, nodeEnv, warn)
}

/** Read the flag from Nitro runtimeConfig (the value Nuxt may override with a string). */
export function blizzardMetaNightlyFromRuntimeConfig(
  config: { blizzardMetaNightly?: unknown },
  nodeEnv = process.env.NODE_ENV,
  warn: (message: string) => void = console.warn,
): boolean {
  return parseBlizzardMetaNightlyFlag(config.blizzardMetaNightly, nodeEnv, warn)
}

/** Snapshot timestamps are stored as unix seconds and shown in Europe/Berlin. */
export function formatMetaFetchedAt(value: string | number | Date | null | undefined): string {
  return formatBerlinTime(value)
}
