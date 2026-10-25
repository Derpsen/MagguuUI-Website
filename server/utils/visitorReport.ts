/**
 * Admin report over the consented visitor log (visitor_sessions / visitor_hits / visitor_events, see visitorLog.ts):
 * filtered, paginated session list, per-session path, summary for the dashboard and a capped CSV export.
 * Pure functions on a `sqlite` handle (relative imports only, unit tested in memory). Admin-only data: the handlers
 * call requireAdminAccess and send Cache-Control: no-store.
 */

import type Database from 'better-sqlite3'
import { csvLine } from '../../utils/csvSafe'
import { isValidSessionId } from '../../utils/consent'
import { VISITOR_DELETE_DAYS } from './visitorLog'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

export const VISITOR_PAGE_SIZE = 25
export const VISITOR_PAGE_SIZE_MAX = 100
export const VISITOR_MAX_OFFSET = 10_000
export const VISITOR_EXPORT_MAX_ROWS = 50_000
export const VISITOR_PERIODS = [1, 7, 30, 90, VISITOR_DELETE_DAYS] as const
const DAY_S = 86400

export interface VisitorFilters {
  /** Two-letter code (stored upper-case) or "unknown". */
  country: string
  /** Last N days; 0 = everything that is stored. */
  days: number
  /** Exact visited path, e.g. /guide. */
  page: string
  /** Referrer host contains this text. */
  referrer: string
  /** Matches utm_source, utm_medium, utm_campaign, utm_term or utm_content exactly (case-insensitive). */
  utm: string
  /** Returning = the same mg_vid had an earlier session. */
  visitor: '' | 'new' | 'returning'
}

export const EMPTY_FILTERS: VisitorFilters = { country: '', days: 30, page: '', referrer: '', utm: '', visitor: '' }

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Validates the query string. Anything unexpected falls back to the default; never throws. */
export function parseVisitorFilters(q: Record<string, unknown>): VisitorFilters {
  const country = text(q.country, 7)
  const days = Number(q.days)
  const visitor = text(q.visitor, 10)
  const page = text(q.page, 200)
  return {
    country: /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : country === 'unknown' ? 'unknown' : '',
    days: days === 0 ? 0 : (VISITOR_PERIODS as readonly number[]).includes(days) ? days : EMPTY_FILTERS.days,
    page: page.startsWith('/') ? page : '',
    referrer: text(q.referrer, 100).toLowerCase(),
    utm: text(q.utm, 100),
    visitor: visitor === 'new' || visitor === 'returning' ? visitor : '',
  }
}

const likeEscape = (s: string) => s.replace(/[\\%_]/g, m => `\\${m}`)

function whereClause(f: VisitorFilters, now: number): { sql: string, args: unknown[] } {
  const parts: string[] = []
  const args: unknown[] = []
  if (f.days > 0) { parts.push('s.started_at >= ?'); args.push(now - f.days * DAY_S) }
  if (f.country) { parts.push('lower(s.country) = lower(?)'); args.push(f.country) }
  if (f.page) { parts.push('EXISTS (SELECT 1 FROM visitor_hits h WHERE h.session_id = s.id AND h.path = ?)'); args.push(f.page) }
  if (f.referrer) { parts.push("s.referrer_host LIKE ? ESCAPE '\\'"); args.push(`%${likeEscape(f.referrer)}%`) }
  if (f.utm) {
    parts.push('(lower(s.utm_source) = lower(?) OR lower(s.utm_medium) = lower(?) OR lower(s.utm_campaign) = lower(?) OR lower(s.utm_term) = lower(?) OR lower(s.utm_content) = lower(?))')
    args.push(f.utm, f.utm, f.utm, f.utm, f.utm)
  }
  const earlier = 's.visitor_id IS NOT NULL AND EXISTS (SELECT 1 FROM visitor_sessions o WHERE o.visitor_id = s.visitor_id AND (o.started_at < s.started_at OR (o.started_at = s.started_at AND o.id < s.id)))'
  if (f.visitor === 'returning') parts.push(`(${earlier})`)
  if (f.visitor === 'new') parts.push(`NOT (${earlier})`)
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', args }
}

export interface VisitorListRow {
  id: string, startedAt: number, lastSeen: number, durationS: number, ip: string | null, userAgent: string | null,
  browser: string, os: string, device: string, country: string, city: string | null, referrerUrl: string | null, referrerHost: string | null,
  utm: string, utmSource: string | null, utmMedium: string | null, utmCampaign: string | null, utmTerm: string | null, utmContent: string | null,
  landingPath: string, exitPath: string | null, pages: number, returning: boolean,
  screen: string | null, language: string | null, timezone: string | null,
}

const SELECT = `SELECT s.id AS id, s.started_at AS startedAt, s.last_seen AS lastSeen, s.ip AS ip, s.user_agent AS userAgent, s.browser AS browser,
  s.os AS os, s.device AS device, s.country AS country, s.city AS city, s.referrer_url AS referrerUrl, s.referrer_host AS referrerHost,
  s.utm_source AS utmSource, s.utm_medium AS utmMedium, s.utm_campaign AS utmCampaign, s.utm_term AS utmTerm, s.utm_content AS utmContent,
  s.landing_path AS landingPath, s.exit_path AS exitPath, s.hits AS pages, s.screen_w AS screenW, s.screen_h AS screenH,
  s.language AS language, s.timezone AS timezone,
  COALESCE((SELECT h.dwell_s FROM visitor_hits h WHERE h.session_id = s.id ORDER BY h.id DESC LIMIT 1), 0) AS lastDwell,
  CASE WHEN s.visitor_id IS NOT NULL AND EXISTS (SELECT 1 FROM visitor_sessions o WHERE o.visitor_id = s.visitor_id AND (o.started_at < s.started_at OR (o.started_at = s.started_at AND o.id < s.id))) THEN 1 ELSE 0 END AS isReturning
  FROM visitor_sessions s`

interface RawRow extends Omit<VisitorListRow, 'durationS' | 'returning' | 'screen' | 'utm'> {
  screenW: number | null, screenH: number | null, lastDwell: number, isReturning: number
}

function toRow(r: RawRow): VisitorListRow {
  const { screenW, screenH, lastDwell, isReturning, ...rest } = r
  const utm = [r.utmSource, r.utmMedium, r.utmCampaign, r.utmTerm, r.utmContent].filter(Boolean).join(' / ')
  return {
    ...rest,
    durationS: Math.max(0, r.lastSeen - r.startedAt) + Math.max(0, lastDwell),
    returning: isReturning === 1,
    screen: screenW && screenH ? `${screenW}×${screenH}` : null,
    utm,
  } as VisitorListRow
}

export interface VisitorPage { rows: VisitorListRow[], total: number, page: number, pageSize: number, pages: number }

export function queryVisitorSessions(sqlite: Sqlite, filters: VisitorFilters, page = 1, pageSize = VISITOR_PAGE_SIZE, now = Math.floor(Date.now() / 1000)): VisitorPage {
  const size = Math.min(Math.max(1, Math.floor(pageSize) || VISITOR_PAGE_SIZE), VISITOR_PAGE_SIZE_MAX)
  const w = whereClause(filters, now)
  const total = (sqlite.prepare(`SELECT COUNT(*) AS n FROM visitor_sessions s ${w.sql}`).get(...w.args) as { n: number }).n
  const pages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages, Math.floor(VISITOR_MAX_OFFSET / size) + 1)
  const rows = sqlite.prepare(`${SELECT} ${w.sql} ORDER BY s.started_at DESC, s.id DESC LIMIT ? OFFSET ?`).all(...w.args, size, (current - 1) * size) as RawRow[]
  return { rows: rows.map(toRow), total, page: current, pageSize: size, pages }
}

export interface VisitorDetail {
  hits: Array<{ path: string, at: number, dwellS: number | null, scrollMax: number }>
  events: Array<{ path: string, kind: string, target: string, at: number }>
}

/** Path of one session: pages in order with dwell and scroll depth, plus its clicks. */
export function visitorDetail(sqlite: Sqlite, sid: string): VisitorDetail | null {
  if (!isValidSessionId(sid)) return null
  if (!sqlite.prepare('SELECT 1 FROM visitor_sessions WHERE id = ?').get(sid)) return null
  return {
    hits: (sqlite.prepare('SELECT path, created_at AS at, dwell_s AS dwellS, scroll_max AS scrollMax FROM visitor_hits WHERE session_id = ? ORDER BY id LIMIT 500').all(sid)) as VisitorDetail['hits'],
    events: (sqlite.prepare('SELECT path, kind, target, created_at AS at FROM visitor_events WHERE session_id = ? ORDER BY id LIMIT 200').all(sid)) as VisitorDetail['events'],
  }
}

/** Filter choices that exist in the stored data (countries with counts). */
export function visitorFilterOptions(sqlite: Sqlite): { countries: Array<{ code: string, sessions: number }>, pages: string[] } {
  return {
    countries: sqlite.prepare('SELECT country AS code, COUNT(*) AS sessions FROM visitor_sessions GROUP BY country ORDER BY sessions DESC, country LIMIT 100').all() as Array<{ code: string, sessions: number }>,
    pages: (sqlite.prepare('SELECT path, COUNT(*) AS n FROM visitor_hits GROUP BY path ORDER BY n DESC, path LIMIT 50').all() as Array<{ path: string }>).map(r => r.path),
  }
}

export interface VisitorSummary {
  sessions: number
  countries: Array<{ code: string, sessions: number }>
  referrers: Array<{ name: string, sessions: number }>
}

/** Dashboard numbers: consented sessions in the last N days, top countries and top referrer hosts (no referrer = "Direct" is left out). */
export function visitorSummary(sqlite: Sqlite, days = 30, limit = 5, now = Math.floor(Date.now() / 1000)): VisitorSummary {
  const since = now - days * DAY_S
  return {
    sessions: (sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_sessions WHERE started_at >= ?').get(since) as { n: number }).n,
    countries: sqlite.prepare('SELECT country AS code, COUNT(*) AS sessions FROM visitor_sessions WHERE started_at >= ? GROUP BY country ORDER BY sessions DESC, country LIMIT ?').all(since, limit) as VisitorSummary['countries'],
    referrers: sqlite.prepare("SELECT referrer_host AS name, COUNT(*) AS sessions FROM visitor_sessions WHERE started_at >= ? AND referrer_host IS NOT NULL AND referrer_host <> '' GROUP BY referrer_host ORDER BY sessions DESC, referrer_host LIMIT ?").all(since, limit) as VisitorSummary['referrers'],
  }
}

// ─── CSV export ─────────────────────────────────────────────────────────────

export const VISITOR_CSV_COLUMNS = [
  'started_at_utc', 'country', 'city', 'ip', 'browser', 'os', 'device', 'referrer_host', 'referrer_url',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'entry_page', 'exit_page', 'pages',
  'duration_s', 'visitor', 'screen', 'language', 'timezone', 'user_agent',
] as const

const iso = (s: number) => new Date(s * 1000).toISOString()

export function visitorCsvRow(r: VisitorListRow): string {
  return csvLine([
    iso(r.startedAt), r.country, r.city, r.ip, r.browser, r.os, r.device, r.referrerHost, r.referrerUrl,
    r.utmSource, r.utmMedium, r.utmCampaign, r.utmTerm, r.utmContent, r.landingPath, r.exitPath, r.pages,
    r.durationS, r.returning ? 'returning' : 'new', r.screen, r.language, r.timezone, r.userAgent,
  ])
}

/**
 * Lazily yields the CSV (header first), at most VISITOR_EXPORT_MAX_ROWS data rows, read in small batches so the
 * whole table is never held in memory. `onDone` receives the number of data rows written.
 */
export function* visitorCsvChunks(sqlite: Sqlite, filters: VisitorFilters, now = Math.floor(Date.now() / 1000), onDone?: (rows: number) => void): Generator<string> {
  yield csvLine([...VISITOR_CSV_COLUMNS])
  const w = whereClause(filters, now)
  const batch = 500
  let written = 0
  while (written < VISITOR_EXPORT_MAX_ROWS) {
    const rows = sqlite.prepare(`${SELECT} ${w.sql} ORDER BY s.started_at DESC, s.id DESC LIMIT ? OFFSET ?`)
      .all(...w.args, Math.min(batch, VISITOR_EXPORT_MAX_ROWS - written), written) as RawRow[]
    if (!rows.length) break
    yield rows.map(r => visitorCsvRow(toRow(r))).join('')
    written += rows.length
    if (rows.length < batch) break
  }
  onDone?.(written)
}
