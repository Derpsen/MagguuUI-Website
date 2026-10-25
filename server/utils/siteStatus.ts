/**
 * Public, coarse site status (GET /api/v1/status, page /status).
 *
 * Only facts the site derives about itself: this process served the request
 * (Website), the database answers a trivial query (Database) and the newest
 * published changelog entry is not ancient (Data freshness). No versions, SHAs,
 * hosts, ports, containers or other services.
 *
 * Uptime comes from a tiny in-process sampler: one row per 5-minute slot in
 * `status_samples` while the site answers its own database. A missing slot (restart,
 * outage, database down) counts as downtime, which is why no probe of anything else
 * is needed. Finished UTC days are rolled up into `status_daily` and the detail rows
 * are pruned. Percentages are only reported once at least 24 h have been observed.
 */

import type Database from 'better-sqlite3'
import {
  worstState, type PublicStatus, type StatusComponent, type StatusState, type StatusUptimeWindow,
} from '../../utils/publicStatus'
import { listActiveStatusNotices, listStatusHistory } from './statusNotices'

type Sqlite = Pick<Database.Database, 'prepare'>

export const SLOT_SECONDS = 300
export const SAMPLE_DETAIL_DAYS = 3
export const DAILY_KEEP_DAYS = 100
export const UPTIME_WINDOWS = [1, 7, 30, 90] as const
export const MIN_OBSERVED_SECONDS = 86400
export const SLOW_DB_MS = 500
export const STALE_CONTENT_DAYS = 180
export const STATUS_CACHE_MS = 45_000
export const UPTIME_NOTE = 'Measured by the site itself every 5 minutes. A missing check, such as a restart or an outage, counts as downtime.'

const DAY = 86400
const dayStart = (ts: number) => Math.floor(ts / DAY) * DAY
const isoDay = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10)
const slotOf = (ts: number) => Math.floor(ts / SLOT_SECONDS) * SLOT_SECONDS

// ─── State derivation (pure) ───────────────────────────────────────────

export interface StatusInput {
  dbOk: boolean
  dbMs: number
  /** Newest published changelog entry, unix seconds; null when there is none. */
  latestPublishedAt: number | null
  now: number
}

export function deriveComponents(input: StatusInput): StatusComponent[] {
  const database: StatusComponent = !input.dbOk
    ? { id: 'database', name: 'Database', state: 'down', note: 'Not responding' }
    : input.dbMs > SLOW_DB_MS
      ? { id: 'database', name: 'Database', state: 'degraded', note: 'Responding slowly' }
      : { id: 'database', name: 'Database', state: 'operational', note: null }

  let content: StatusComponent
  if (!input.dbOk) {
    content = { id: 'content', name: 'Data freshness', state: 'down', note: 'Content cannot be read' }
  } else if (input.latestPublishedAt === null) {
    content = { id: 'content', name: 'Data freshness', state: 'operational', note: 'No release notes published yet' }
  } else {
    const ageDays = (input.now - input.latestPublishedAt) / DAY
    content = {
      id: 'content',
      name: 'Data freshness',
      state: ageDays > STALE_CONTENT_DAYS ? 'degraded' : 'operational',
      note: `Latest release note: ${isoDay(input.latestPublishedAt)}`,
    }
  }

  return [{ id: 'website', name: 'Website', state: 'operational', note: null }, database, content]
}

export const overallState = (components: StatusComponent[]): StatusState => worstState(components.map(c => c.state))

// ─── Sampler ───────────────────────────────────────────────────────────

/** Records the current 5-minute slot once. Returns true when a row was added. */
export function recordStatusSample(sqlite: Sqlite, now: number): boolean {
  return sqlite.prepare('INSERT OR IGNORE INTO status_samples (slot) VALUES (?)').run(slotOf(now)).changes > 0
}

/** Rolls finished UTC days up into status_daily (idempotent). Returns the number of new day rows. */
export function rollupStatusDays(sqlite: Sqlite, now: number): number {
  return sqlite.prepare(`INSERT OR IGNORE INTO status_daily (day, seen, first_slot)
    SELECT strftime('%Y-%m-%d', slot, 'unixepoch'), COUNT(*), MIN(slot)
    FROM status_samples WHERE slot < ? GROUP BY 1`).run(dayStart(now)).changes
}

/** Deletes detail rows after SAMPLE_DETAIL_DAYS and daily rows after DAILY_KEEP_DAYS. Roll up first. */
export function pruneStatus(sqlite: Sqlite, now: number): { samples: number, days: number } {
  const samples = sqlite.prepare('DELETE FROM status_samples WHERE slot < ?').run(dayStart(now) - SAMPLE_DETAIL_DAYS * DAY).changes
  const days = sqlite.prepare('DELETE FROM status_daily WHERE day < ?').run(isoDay(now - DAILY_KEEP_DAYS * DAY)).changes
  return { samples, days }
}

export function runStatusMaintenance(sqlite: Sqlite, now: number) {
  return { rolled: rollupStatusDays(sqlite, now), ...pruneStatus(sqlite, now) }
}

// ─── Uptime ────────────────────────────────────────────────────────────

export interface UptimeReport { ready: boolean, windows: StatusUptimeWindow[], note: string }

export function computeUptime(sqlite: Sqlite, now: number): UptimeReport {
  const empty: UptimeReport = { ready: false, windows: [], note: UPTIME_NOTE }
  const firstDaily = (sqlite.prepare('SELECT MIN(first_slot) AS t FROM status_daily').get() as { t: number | null }).t
  const firstRaw = (sqlite.prepare('SELECT MIN(slot) AS t FROM status_samples').get() as { t: number | null }).t
  const candidates = [firstDaily, firstRaw].filter((t): t is number => typeof t === 'number')
  if (!candidates.length) return empty
  const first = Math.min(...candidates)
  const end = slotOf(now) // current, still running slot is excluded
  const span = end - first
  if (span < MIN_OBSERVED_SECONDS) return empty

  const today = dayStart(now)
  const windows: StatusUptimeWindow[] = []
  for (const days of UPTIME_WINDOWS) {
    if (span < days * DAY) continue
    let seen: number
    let start: number
    if (days === 1) {
      start = end - DAY
      seen = (sqlite.prepare('SELECT COUNT(*) AS n FROM status_samples WHERE slot >= ? AND slot < ?').get(start, end) as { n: number }).n
    } else {
      start = Math.max(today - (days - 1) * DAY, first)
      const rolled = (sqlite.prepare('SELECT COALESCE(SUM(seen), 0) AS n FROM status_daily WHERE day >= ? AND day < ?').get(isoDay(start), isoDay(today)) as { n: number }).n
      const raw = (sqlite.prepare(`SELECT COUNT(*) AS n FROM status_samples WHERE slot >= ? AND slot < ?
        AND strftime('%Y-%m-%d', slot, 'unixepoch') NOT IN (SELECT day FROM status_daily)`).get(start, end) as { n: number }).n
      seen = rolled + raw
    }
    const expected = Math.round((end - start) / SLOT_SECONDS)
    if (expected <= 0) continue
    const percent = Math.floor(Math.min(1, seen / expected) * 10000) / 100
    windows.push({ days, percent })
  }
  return { ready: windows.length > 0, windows, note: UPTIME_NOTE }
}

// ─── Public payload ────────────────────────────────────────────────────

export function buildPublicStatus(sqlite: Sqlite, now: number = Math.floor(Date.now() / 1000)): PublicStatus {
  let dbOk = true
  let latestPublishedAt: number | null = null
  const t0 = performance.now()
  try {
    sqlite.prepare('SELECT 1').get()
    const row = sqlite.prepare('SELECT MAX(published_at) AS t FROM changelogs WHERE is_published = 1').get() as { t: number | null }
    latestPublishedAt = typeof row.t === 'number' ? (row.t > 1e11 ? Math.floor(row.t / 1000) : row.t) : null
  } catch {
    dbOk = false
  }
  const dbMs = performance.now() - t0

  const components = deriveComponents({ dbOk, dbMs, latestPublishedAt, now })
  let uptime: UptimeReport = { ready: false, windows: [], note: UPTIME_NOTE }
  try { uptime = computeUptime(sqlite, now) } catch { /* sampling tables unreadable: keep "collecting data" */ }

  return {
    status: overallState(components),
    checkedAt: new Date(now * 1000).toISOString(),
    components,
    uptime,
    notices: listActiveStatusNotices(now),
    history: listStatusHistory(now),
  }
}

// ─── Short cache: the endpoint can never be used to hammer the database ─

const g = globalThis as unknown as { __publicStatusCache?: { at: number, value: PublicStatus } | null }

export function getPublicStatus(sqlite: Sqlite, nowMs: number = Date.now()): PublicStatus {
  const hit = g.__publicStatusCache
  if (hit && nowMs - hit.at < STATUS_CACHE_MS && nowMs >= hit.at) return hit.value
  const value = buildPublicStatus(sqlite, Math.floor(nowMs / 1000))
  g.__publicStatusCache = { at: nowMs, value }
  return value
}

export function clearPublicStatusCache(): void {
  g.__publicStatusCache = null
}
