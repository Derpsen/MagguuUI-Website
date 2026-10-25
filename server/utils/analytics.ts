/**
 * Cookieless anonymous counting: storage, daily roll-up, retention, reporting.
 *
 * What is kept (and what never is):
 * - page_views detail rows: route, referrer HOST, device/browser/OS family, a
 *   per-day visitor hash. NEVER the raw IP or user agent.
 * - The visitor hash is HMAC-SHA256(daily random salt, coarse IP + browser + OS +
 *   device). The salt lives only in process memory, rotates every UTC day and is
 *   never written anywhere, so hashes cannot be reversed or linked across days.
 *   A restart mid-day starts a new salt (uniques can then be over-counted a bit).
 * - Completed days are rolled up into stats_daily (per route, per copied item,
 *   per referrer/device/browser/OS); detail rows are pruned after RAW_DETAIL_DAYS.
 * Pure functions on a `sqlite` handle so everything is unit-tested in memory.
 */

import { createHmac, randomBytes } from 'node:crypto'
import type Database from 'better-sqlite3'
import { COPY_TYPES, TRACKED_ROUTES, type CopyType } from '../../utils/trackingRules'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

/** Detail rows (page_views / copy_events) are kept this many whole UTC days. */
export const RAW_DETAIL_DAYS = 14
/** Daily aggregates carry no per-visitor data and are kept this long. */
export const AGGREGATE_DAYS = 400
export const REPORT_RANGES = [7, 30, 90] as const

const DAY_S = 86400
export const isoDay = (tsSeconds: number) => new Date(tsSeconds * 1000).toISOString().slice(0, 10)
export const dayStart = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000)
const startOfUtcDay = (tsSeconds: number) => Math.floor(tsSeconds / DAY_S) * DAY_S

// ─── visitor hash ───────────────────────────────────────────────────────────

/** IPv4 → /24, IPv6 → /48. Only used as hash input, never stored. */
export function coarseIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  const v4 = mapped?.[1] ?? (ip.includes(':') ? null : ip)
  if (v4) {
    const parts = v4.split('.')
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : 'unknown'
  }
  const [head = '', tail = ''] = ip.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const groups = [...headGroups, ...Array(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill('0'), ...tailGroups]
  return `${groups.slice(0, 3).join(':')}::/48`
}

export interface SaltKeeper { get: (nowMs?: number) => Buffer }

/** Random salt held in memory only; a new one for every UTC day. */
export function createSaltKeeper(random: () => Buffer = () => randomBytes(32)): SaltKeeper {
  let day = Number.NaN
  let salt: Buffer | null = null
  return {
    get(nowMs = Date.now()) {
      const d = Math.floor(nowMs / (DAY_S * 1000))
      if (!salt || d !== day) { day = d; salt = random() }
      return salt
    },
  }
}

const g = globalThis as unknown as { __analyticsSalt?: SaltKeeper }
export const dailySalt: SaltKeeper = g.__analyticsSalt ?? (g.__analyticsSalt = createSaltKeeper())

export interface VisitorInput { ip: string, browser: string, os: string, device: string }

export function visitorHash(salt: Buffer, input: VisitorInput): string {
  return createHmac('sha256', salt).update(`${coarseIp(input.ip)}|${input.browser}|${input.os}|${input.device}`).digest('hex').slice(0, 16)
}

/** Rate-limit / dedup key for an IP: salted per day, so no raw IP lands in the rate_limits table. */
export function anonymousKey(salt: Buffer, ip: string): string {
  return createHmac('sha256', salt).update(`rl|${ip}`).digest('hex').slice(0, 16)
}

/** Referrer reduced to its hostname; own host and junk are dropped. */
export function referrerHost(referrer: unknown, ownHost: string): string | null {
  if (typeof referrer !== 'string' || !referrer || referrer.length > 253) return null
  const host = referrer.includes('/') ? (() => { try { return new URL(referrer).hostname } catch { return '' } })() : referrer.toLowerCase()
  if (!host || !/^[a-z0-9.-]+$/i.test(host)) return null
  const own = ownHost.split(':')[0]?.toLowerCase()
  return host === own || host === 'localhost' ? null : host.toLowerCase()
}

// ─── writes ─────────────────────────────────────────────────────────────────

export interface ViewInput { path: string, referrer: string | null, device: string, browser: string, os: string, visitor: string }

export function recordView(sqlite: Sqlite, v: ViewInput, now = Math.floor(Date.now() / 1000)) {
  sqlite.prepare(
    'INSERT INTO page_views (path, referrer, device_type, browser, os, visitor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(v.path, v.referrer, v.device, v.browser, v.os, v.visitor, now)
}

const COPY_TABLES: Record<CopyType, string> = { profile: 'profiles', wowup: 'wowup_strings', layout: 'character_layouts' }

/** Allowlist: the target must exist and be published. */
export function isCopyTarget(sqlite: Sqlite, type: CopyType, id: number): boolean {
  if (!COPY_TYPES.includes(type)) return false
  return !!sqlite.prepare(`SELECT 1 AS ok FROM ${COPY_TABLES[type]} WHERE id = ? AND is_visible = 1`).get(id)
}

export function recordCopy(sqlite: Sqlite, type: CopyType, id: number, now = Math.floor(Date.now() / 1000)) {
  sqlite.prepare('INSERT INTO copy_events (string_type, string_id, created_at) VALUES (?, ?, ?)').run(type, id, now)
}

// ─── daily roll-up ──────────────────────────────────────────────────────────

export interface StatRow { day: string, kind: string, key: string, views: number, uniques: number }

const VISITOR_EXPR = "COALESCE(visitor, NULLIF(ip, 'unknown'))"

/** Aggregate one UTC day of page_views detail into stats_daily rows. */
export function viewRows(sqlite: Sqlite, day: string): StatRow[] {
  const from = dayStart(day)
  const to = from + DAY_S
  const out: StatRow[] = []
  const site = sqlite.prepare(`SELECT COUNT(*) AS v, COUNT(DISTINCT ${VISITOR_EXPR}) AS u FROM page_views WHERE created_at >= ? AND created_at < ?`).get(from, to) as { v: number, u: number }
  if (!site.v) return out
  out.push({ day, kind: 'site', key: '', views: site.v, uniques: site.u })
  // Legacy rows may carry query strings or non-public paths (admin): the per-route view only lists the allowlisted routes.
  const placeholders = TRACKED_ROUTES.map(() => '?').join(',')
  const routeExpr = "RTRIM(CASE WHEN instr(path, '?') > 0 THEN substr(path, 1, instr(path, '?') - 1) ELSE path END, '/')"
  const routes = sqlite.prepare(`SELECT CASE WHEN ${routeExpr} = '' THEN '/' ELSE ${routeExpr} END AS k, COUNT(*) AS v, COUNT(DISTINCT ${VISITOR_EXPR}) AS u FROM page_views WHERE created_at >= ? AND created_at < ? GROUP BY k HAVING k IN (${placeholders})`).all(from, to, ...TRACKED_ROUTES) as Array<{ k: string, v: number, u: number }>
  for (const r of routes) out.push({ day, kind: 'route', key: r.k, views: r.v, uniques: r.u })
  for (const [kind, col] of [['referrer', 'referrer'], ['device', 'device_type'], ['browser', 'browser'], ['os', 'os']] as const) {
    const rows = sqlite.prepare(`SELECT ${col} AS k, COUNT(*) AS v FROM page_views WHERE created_at >= ? AND created_at < ? AND ${col} IS NOT NULL AND ${col} <> '' GROUP BY ${col}`).all(from, to) as Array<{ k: string, v: number }>
    for (const r of rows) out.push({ day, kind, key: r.k, views: r.v, uniques: 0 })
  }
  return out
}

/** Aggregate one UTC day of copy_events detail. */
export function copyRows(sqlite: Sqlite, day: string): StatRow[] {
  const from = dayStart(day)
  const to = from + DAY_S
  const rows = sqlite.prepare("SELECT string_type || ':' || string_id AS k, COUNT(*) AS v FROM copy_events WHERE created_at >= ? AND created_at < ? GROUP BY string_type, string_id").all(from, to) as Array<{ k: string, v: number }>
  if (!rows.length) return []
  const total = rows.reduce((n, r) => n + r.v, 0)
  return [{ day, kind: 'copy-site', key: '', views: total, uniques: 0 }, ...rows.map(r => ({ day, kind: 'copy', key: r.k, views: r.v, uniques: 0 }))]
}

function insertRows(sqlite: Sqlite, rows: StatRow[]) {
  const stmt = sqlite.prepare('INSERT OR IGNORE INTO stats_daily (day, kind, key, views, uniques) VALUES (?, ?, ?, ?, ?)')
  for (const r of rows) stmt.run(r.day, r.kind, r.key, r.views, r.uniques)
}

/** Roll every completed UTC day (before today) that is not rolled up yet. Idempotent. */
export function rollupCompletedDays(sqlite: Sqlite, now = Math.floor(Date.now() / 1000)): number {
  const today = startOfUtcDay(now)
  let done = 0
  const pending = (table: string, marker: string) => (sqlite.prepare(
    `SELECT d FROM (SELECT DISTINCT date(created_at, 'unixepoch') AS d FROM ${table} WHERE created_at < ?)
     WHERE d NOT IN (SELECT day FROM stats_daily WHERE kind = ?) ORDER BY d`,
  ).all(today, marker) as Array<{ d: string }>).map(r => r.d)
  const run = sqlite.transaction(() => {
    for (const day of pending('page_views', 'site')) { insertRows(sqlite, viewRows(sqlite, day)); done++ }
    for (const day of pending('copy_events', 'copy-site')) { insertRows(sqlite, copyRows(sqlite, day)); done++ }
  })
  run()
  return done
}

/** One-time clean-up of rows written before counting became anonymous. Idempotent. */
export function scrubLegacyIdentifiers(sqlite: Sqlite): number {
  const a = sqlite.prepare('UPDATE page_views SET ip = NULL, user_agent = NULL WHERE ip IS NOT NULL OR user_agent IS NOT NULL').run().changes
  const b = sqlite.prepare('UPDATE copy_events SET ip = NULL WHERE ip IS NOT NULL').run().changes
  return a + b
}

/** Delete detail rows older than `days` whole UTC days (after rolling them up) and old aggregates. */
export function pruneDetail(sqlite: Sqlite, now = Math.floor(Date.now() / 1000), days = RAW_DETAIL_DAYS) {
  rollupCompletedDays(sqlite, now)
  const cutoff = startOfUtcDay(now) - days * DAY_S
  const views = sqlite.prepare('DELETE FROM page_views WHERE created_at < ?').run(cutoff).changes
  const copies = sqlite.prepare('DELETE FROM copy_events WHERE created_at < ?').run(cutoff).changes
  const aggregates = sqlite.prepare('DELETE FROM stats_daily WHERE day < ?').run(isoDay(startOfUtcDay(now) - AGGREGATE_DAYS * DAY_S)).changes
  return { views, copies, aggregates }
}

/** Order matters: legacy days are rolled up (their distinct IPs counted) BEFORE the IPs are scrubbed. */
export function runAnalyticsMaintenance(sqlite: Sqlite, now = Math.floor(Date.now() / 1000)) {
  const rolled = rollupCompletedDays(sqlite, now)
  const scrubbed = scrubLegacyIdentifiers(sqlite)
  const pruned = pruneDetail(sqlite, now)
  return { rolled, scrubbed, pruned }
}

// ─── report ─────────────────────────────────────────────────────────────────

export interface TrafficReport {
  days: number
  from: string
  to: string
  totals: { views: number, visitors: number, copies: number }
  perDay: Array<{ day: string, views: number, visitors: number, copies: number }>
  routes: Array<{ path: string, views: number, visitors: number }>
  copied: Array<{ type: string, id: number, name: string, copies: number }>
  referrers: Array<{ name: string, views: number }>
  devices: Array<{ name: string, views: number }>
  browsers: Array<{ name: string, views: number }>
  os: Array<{ name: string, views: number }>
}

function copyName(sqlite: Sqlite, type: string, id: number): string {
  const one = <T>(sql: string) => sqlite.prepare(sql).get(id) as T | undefined
  if (type === 'profile') {
    const p = one<{ addon: string, profile: string }>('SELECT addon, profile FROM profiles WHERE id = ?')
    if (p) return `${p.addon} - ${p.profile}`
  } else if (type === 'wowup') {
    const w = one<{ name: string }>('SELECT name FROM wowup_strings WHERE id = ?')
    if (w) return w.name
  } else if (type === 'layout') {
    const l = one<{ name: string, class_name: string | null, spec: string | null }>('SELECT name, class_name, spec FROM character_layouts WHERE id = ?')
    if (l) return l.class_name && l.spec ? `${l.class_name} - ${l.spec}` : l.name
  }
  return `${type} #${id}`
}

const bump = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n)
const top = (m: Map<string, number>, limit: number) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)

/**
 * Per-route views, top copied items and daily totals for the last `days` UTC days
 * (today included). Completed days come from stats_daily; days not rolled up yet
 * (today) are aggregated live from the detail rows. Visitors are the SUM of daily
 * uniques: hashes rotate daily, so people cannot be linked across days.
 */
export function trafficReport(sqlite: Sqlite, days: number, now = Math.floor(Date.now() / 1000)): TrafficReport {
  const span = Math.min(Math.max(1, Math.floor(days)), AGGREGATE_DAYS)
  rollupCompletedDays(sqlite, now)
  const toDay = isoDay(now)
  const fromDay = isoDay(startOfUtcDay(now) - (span - 1) * DAY_S)

  const rows = sqlite.prepare('SELECT day, kind, key, views, uniques FROM stats_daily WHERE day >= ? AND day <= ?').all(fromDay, toDay) as StatRow[]
  const rolled = new Set(rows.filter(r => r.kind === 'site' || r.kind === 'copy-site').map(r => `${r.day}|${r.kind}`))
  const fromTs = dayStart(fromDay)
  const live = (table: string) => (sqlite.prepare(`SELECT DISTINCT date(created_at, 'unixepoch') AS d FROM ${table} WHERE created_at >= ?`).all(fromTs) as Array<{ d: string }>).map(r => r.d)
  for (const d of live('page_views')) if (d <= toDay && !rolled.has(`${d}|site`)) rows.push(...viewRows(sqlite, d))
  for (const d of live('copy_events')) if (d <= toDay && !rolled.has(`${d}|copy-site`)) rows.push(...copyRows(sqlite, d))

  const perDay = new Map<string, { views: number, visitors: number, copies: number }>()
  for (let i = 0; i < span; i++) perDay.set(isoDay(dayStart(fromDay) + i * DAY_S), { views: 0, visitors: 0, copies: 0 })
  const routes = new Map<string, { views: number, visitors: number }>()
  const copied = new Map<string, number>()
  const referrers = new Map<string, number>(); const devices = new Map<string, number>()
  const browsers = new Map<string, number>(); const oses = new Map<string, number>()
  const totals = { views: 0, visitors: 0, copies: 0 }

  for (const r of rows) {
    const d = perDay.get(r.day)
    if (!d) continue
    if (r.kind === 'site') { d.views += r.views; d.visitors += r.uniques; totals.views += r.views; totals.visitors += r.uniques }
    else if (r.kind === 'copy-site') { d.copies += r.views; totals.copies += r.views }
    else if (r.kind === 'route') { const e = routes.get(r.key) ?? { views: 0, visitors: 0 }; e.views += r.views; e.visitors += r.uniques; routes.set(r.key, e) }
    else if (r.kind === 'copy') bump(copied, r.key, r.views)
    else if (r.kind === 'referrer') bump(referrers, r.key, r.views)
    else if (r.kind === 'device') bump(devices, r.key, r.views)
    else if (r.kind === 'browser') bump(browsers, r.key, r.views)
    else if (r.kind === 'os') bump(oses, r.key, r.views)
  }
  const named = (m: Map<string, number>) => top(m, 10).map(([name, views]) => ({ name, views }))
  return {
    days: span,
    from: fromDay,
    to: toDay,
    totals,
    perDay: [...perDay].map(([day, v]) => ({ day, ...v })),
    routes: [...routes].map(([path, v]) => ({ path, ...v })).sort((a, b) => b.views - a.views || a.path.localeCompare(b.path)).slice(0, 50),
    copied: top(copied, 20).map(([key, copies]) => {
      const [type = '', rawId = '0'] = key.split(':')
      const id = Number(rawId)
      return { type, id, name: copyName(sqlite, type, id), copies }
    }),
    referrers: named(referrers),
    devices: named(devices),
    browsers: named(browsers),
    os: named(oses),
  }
}
