/**
 * Nightly GitHub job clock: cron 02:30 UTC, admin display in Europe/Berlin.
 * Uses UTC getters/setters only so the next run does not depend on the container TZ.
 */

export const GITHUB_NIGHTLY_CRON = '30 2 * * *'
export const GITHUB_NIGHTLY_CRON_TZ = 'UTC'
export const GITHUB_NIGHTLY_DISPLAY_TZ = 'Europe/Berlin'

const BERLIN_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: GITHUB_NIGHTLY_DISPLAY_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZoneName: 'short',
}

/** Next 02:30 UTC at or after `from` (if `from` is exactly 02:30:00.000Z, the following day). */
export function nextGithubNightlyRun(from = new Date()): Date {
  const next = new Date(from.getTime())
  next.setUTCMilliseconds(0)
  next.setUTCSeconds(0)
  next.setUTCMinutes(30)
  next.setUTCHours(2)
  if (next.getTime() <= from.getTime()) next.setUTCDate(next.getUTCDate() + 1)
  return next
}

export function formatBerlinTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return ''
  const date = value instanceof Date
    ? value
    : typeof value === 'number'
      ? new Date(value < 1e12 ? value * 1000 : value)
      : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', BERLIN_FORMAT).format(date)
}

/**
 * Nightly job kill switch (NUXT_GITHUB_NIGHTLY).
 * Default: on in production, off in development. Explicit true/false wins.
 * The string "false" must not be treated as on (Nuxt would otherwise leave it truthy).
 */
export function isGithubNightlyEnabled(
  env: NodeJS.ProcessEnv = process.env,
  nodeEnv = env.NODE_ENV ?? process.env.NODE_ENV,
): boolean {
  const raw = env.NUXT_GITHUB_NIGHTLY
  if (raw == null || raw.trim() === '') return nodeEnv === 'production'
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}
