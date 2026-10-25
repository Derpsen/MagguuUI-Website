/**
 * Detailed visitor log: ONLY for visitors who gave statistics consent (see utils/consent.ts) and only while
 * NUXT_VISITOR_LOG is on (the default). Pure functions on a `sqlite` handle (unit tested in memory, relative imports only).
 *
 * visitor_sessions: one row per visit (random 128-bit id held in the consent-bound mg_sid cookie, 30 minutes
 * rolling) with the full IP, the full user agent, parsed browser/OS/device family, country (CF-IPCountry) and city
 * (a Cloudflare header, only if it is there) from a trusted proxy only, the referrer URL (capped) + host, UTM
 * parameters, screen size, language, time zone, entry (landing_path) and exit page (exit_path), and the
 * returning-visitor id (mg_vid cookie, 13 months).
 * visitor_hits: one row per visited known public route (the page sequence) with dwell time and scroll depth.
 * visitor_events: clicks on marked CTAs, downloads and external links (fixed kinds, short targets, no free text).
 *
 * Retention (pruneVisitorRecords, runs with the other maintenance jobs, also while the flag is off):
 * everything is kept in full for 13 months (395 days) after the last activity, then DELETED. No anonymization step.
 * Caps bound the rows a scripted client can create. Revoking consent deletes that visitor's rows.
 *
 * Hook for the admin "Visitors" view (part 2): listVisitorSessions / sessionHits / sessionEvents below.
 */

import { randomBytes } from 'node:crypto'
import type Database from 'better-sqlite3'
import { SESSION_MAX_AGE_S, isValidSessionId } from '../../utils/consent'
import { rateLimitIpKey } from './clientIp'
import { checkpointWal } from './walCheckpoint'
import { DWELL_MAX_S, SCROLL_MILESTONES, type ClickKind, type DeviceEnv, type Utm, type UtmKey } from '../../utils/visitorSignals'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

/** 13 months. */
export const VISITOR_DELETE_DAYS = 395
export const VISITOR_SESSIONS_PER_DAY = 5000
export const VISITOR_HITS_PER_DAY = 50_000
/**
 * Per network (IPv4 address, IPv6 /64) and day. The consent cookie is a plain cookie anyone can set by hand, so one
 * client could otherwise fill the global daily limits above and shut every real visitor out of the log.
 */
export const VISITOR_SESSIONS_PER_IP_DAY = 100
export const VISITOR_HITS_PER_IP_DAY = 3000
export const VISITOR_EVENTS_PER_DAY = 50_000
export const VISITOR_HITS_PER_SESSION = 500
export const VISITOR_EVENTS_PER_SESSION = 200
const DAY_S = 86400

export interface VisitorHitInput {
  /** Value of the mg_sid cookie as sent (validated here); an unknown or expired id starts a new session. */
  sid: string | null
  /** Value of the mg_vid cookie as sent; accepted only if the server issued it (it is on a stored session). */
  vid: string | null
  ip: string
  userAgent: string
  browser: string
  os: string
  device: string
  country: string
  city: string | null
  referrerUrl: string | null
  referrerHost: string | null
  path: string
  env: DeviceEnv
  utm: Utm
}

export type VisitorHitResult =
  | { recorded: true, sid: string, vid: string, created: boolean, newVisitor: boolean }
  | { recorded: false, sid: string | null, reason: 'day_cap' | 'ip_cap' | 'session_cap' }

const cap = (value: string | null | undefined, max: number) => (value ? value.slice(0, max) : null)
export const newSessionId = () => randomBytes(16).toString('hex')
export const newVisitorId = () => randomBytes(16).toString('hex')

/** Store one visit step. Session and visitor ids come from the server only: a client-chosen id is never adopted. */
export function recordVisitorHit(sqlite: Sqlite, input: VisitorHitInput, now = Math.floor(Date.now() / 1000)): VisitorHitResult {
  return sqlite.transaction((): VisitorHitResult => {
    const dayStart = Math.floor(now / DAY_S) * DAY_S
    const hitsToday = (sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_hits WHERE created_at >= ?').get(dayStart) as { c: number }).c
    if (hitsToday >= VISITOR_HITS_PER_DAY) return { recorded: false, sid: null, reason: 'day_cap' }
    const ipBucket = rateLimitIpKey(input.ip)
    const hitsFromIp = (sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_hits h JOIN visitor_sessions s ON s.id = h.session_id WHERE s.ip_bucket = ? AND h.created_at >= ?').get(ipBucket, dayStart) as { c: number }).c
    if (hitsFromIp >= VISITOR_HITS_PER_IP_DAY) return { recorded: false, sid: null, reason: 'ip_cap' }

    let sid: string | null = null
    let vid: string | null = null
    if (isValidSessionId(input.sid)) {
      const row = sqlite.prepare('SELECT id, visitor_id AS vid, hits, last_seen AS lastSeen FROM visitor_sessions WHERE id = ?').get(input.sid) as { id: string, vid: string | null, hits: number, lastSeen: number } | undefined
      if (row && now - row.lastSeen <= SESSION_MAX_AGE_S) {
        if (row.hits >= VISITOR_HITS_PER_SESSION) return { recorded: false, sid: row.id, reason: 'session_cap' }
        sid = row.id
        vid = row.vid
      }
    }

    let created = false
    let newVisitor = false
    if (!sid) {
      const sessionsToday = (sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_sessions WHERE started_at >= ?').get(dayStart) as { c: number }).c
      if (sessionsToday >= VISITOR_SESSIONS_PER_DAY) return { recorded: false, sid: null, reason: 'day_cap' }
      const sessionsFromIp = (sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_sessions WHERE ip_bucket = ? AND started_at >= ?').get(ipBucket, dayStart) as { c: number }).c
      if (sessionsFromIp >= VISITOR_SESSIONS_PER_IP_DAY) return { recorded: false, sid: null, reason: 'ip_cap' }
      if (isValidSessionId(input.vid) && sqlite.prepare('SELECT 1 AS ok FROM visitor_sessions WHERE visitor_id = ? LIMIT 1').get(input.vid)) vid = input.vid
      if (!vid) { vid = newVisitorId(); newVisitor = true }
      sid = newSessionId()
      created = true
      const utm = (k: UtmKey) => cap(input.utm[k], 100)
      sqlite.prepare(`INSERT INTO visitor_sessions
        (id, visitor_id, started_at, last_seen, ip, ip_bucket, user_agent, browser, os, device, country, city, referrer_url, referrer_host, landing_path, exit_path, hits,
         screen_w, screen_h, language, timezone, utm_source, utm_medium, utm_campaign, utm_term, utm_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        sid, vid, now, now, cap(input.ip, 64), cap(ipBucket, 64), cap(input.userAgent, 400), cap(input.browser, 30) ?? 'Other', cap(input.os, 30) ?? 'Other',
        cap(input.device, 12) ?? 'desktop', /^[A-Z]{2}$/.test(input.country) ? input.country : 'unknown', cap(input.city, 60),
        cap(input.referrerUrl, 500), cap(input.referrerHost, 253), input.path, input.path,
        input.env.screenW, input.env.screenH, cap(input.env.language, 35), cap(input.env.timezone, 64),
        utm('utm_source'), utm('utm_medium'), utm('utm_campaign'), utm('utm_term'), utm('utm_content'),
      )
    }
    sqlite.prepare('INSERT INTO visitor_hits (session_id, path, created_at) VALUES (?, ?, ?)').run(sid, input.path, now)
    sqlite.prepare('UPDATE visitor_sessions SET hits = hits + 1, last_seen = ?, exit_path = ? WHERE id = ?').run(now, input.path, sid)
    return { recorded: true, sid, vid: vid!, created, newVisitor }
  })()
}

// ─── events: dwell time, scroll depth, clicks ───────────────────────────────

export type VisitorEventInput =
  | { type: 'leave', path: string, dwellS: number, scroll: number }
  | { type: 'click', path: string, kind: ClickKind, target: string }

/**
 * A leave report adds the visible seconds and raises the scroll milestone of the newest hit of that page; a click
 * is appended. Both need an existing session (the cookie), never create one, and are capped per session and day.
 */
export function recordVisitorEvent(sqlite: Sqlite, sid: unknown, ev: VisitorEventInput, now = Math.floor(Date.now() / 1000)): boolean {
  if (!isValidSessionId(sid)) return false
  return sqlite.transaction(() => {
    const session = sqlite.prepare('SELECT id FROM visitor_sessions WHERE id = ?').get(sid)
    if (!session) return false
    if (ev.type === 'leave') {
      const scroll = (SCROLL_MILESTONES as readonly number[]).includes(ev.scroll) ? ev.scroll : 0
      const dwell = Math.min(DWELL_MAX_S, Math.max(0, Math.round(ev.dwellS)))
      const row = sqlite.prepare('SELECT id FROM visitor_hits WHERE session_id = ? AND path = ? ORDER BY id DESC LIMIT 1').get(sid, ev.path) as { id: number } | undefined
      if (!row) return false
      sqlite.prepare('UPDATE visitor_hits SET dwell_s = MIN(?, COALESCE(dwell_s, 0) + ?), scroll_max = MAX(scroll_max, ?) WHERE id = ?').run(DWELL_MAX_S, dwell, scroll, row.id)
      return true
    }
    const dayStart = Math.floor(now / DAY_S) * DAY_S
    if ((sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_events WHERE created_at >= ?').get(dayStart) as { c: number }).c >= VISITOR_EVENTS_PER_DAY) return false
    if ((sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_events WHERE session_id = ?').get(sid) as { c: number }).c >= VISITOR_EVENTS_PER_SESSION) return false
    sqlite.prepare('INSERT INTO visitor_events (session_id, path, kind, target, created_at) VALUES (?, ?, ?, ?, ?)').run(sid, ev.path, ev.kind, ev.target.slice(0, 100), now)
    return true
  })()
}

// ─── deleting ───────────────────────────────────────────────────────────────

/** One visit's rows (hits, events, session). Unknown or malformed ids delete nothing. */
export function deleteVisitorSession(sqlite: Sqlite, sid: unknown): number {
  if (!isValidSessionId(sid)) return 0
  return sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM visitor_hits WHERE session_id = ?').run(sid)
    sqlite.prepare('DELETE FROM visitor_events WHERE session_id = ?').run(sid)
    return sqlite.prepare('DELETE FROM visitor_sessions WHERE id = ?').run(sid).changes
  })()
}

/**
 * Consent withdrawn: everything tied to this browser goes, the current visit and every earlier visit that carries the
 * same returning-visitor id. Returns the number of sessions deleted.
 */
export function deleteVisitorRecords(sqlite: Sqlite, ids: { sid?: unknown, vid?: unknown }): number {
  let total = deleteVisitorSession(sqlite, ids.sid)
  if (isValidSessionId(ids.vid)) {
    const rows = sqlite.prepare('SELECT id FROM visitor_sessions WHERE visitor_id = ?').all(ids.vid) as Array<{ id: string }>
    for (const r of rows) total += deleteVisitorSession(sqlite, r.id)
  }
  return total
}

/**
 * Consent withdrawn or refused: delete as above, then truncate the WAL so the rows are gone from the disk, not only from
 * the tables (Privacy s12 "deleted right away"). Only when something was deleted.
 */
export function withdrawVisitorRecords(sqlite: Sqlite & Pick<Database.Database, 'pragma'>, ids: { sid?: unknown, vid?: unknown }): number {
  const deleted = deleteVisitorRecords(sqlite, ids)
  if (deleted > 0) checkpointWal(sqlite)
  return deleted
}

/** Everything older than 13 months is deleted in full (sessions by last visit; hits and events by their own time; orphans too). */
export function deleteExpiredVisitorRecords(sqlite: Sqlite, now = Math.floor(Date.now() / 1000), days = VISITOR_DELETE_DAYS) {
  const cutoff = now - days * DAY_S
  return sqlite.transaction(() => {
    const hits = sqlite.prepare('DELETE FROM visitor_hits WHERE created_at < ? OR session_id NOT IN (SELECT id FROM visitor_sessions)').run(cutoff).changes
    const events = sqlite.prepare('DELETE FROM visitor_events WHERE created_at < ? OR session_id NOT IN (SELECT id FROM visitor_sessions)').run(cutoff).changes
    const sessions = sqlite.prepare('DELETE FROM visitor_sessions WHERE last_seen < ?').run(cutoff).changes
    return { sessions, hits, events }
  })()
}

export function pruneVisitorRecords(sqlite: Sqlite, now = Math.floor(Date.now() / 1000)) {
  return deleteExpiredVisitorRecords(sqlite, now)
}

// ─── hooks for the admin view (part 2) ──────────────────────────────────────

export interface VisitorSessionRow {
  id: string, visitorId: string | null, startedAt: number, lastSeen: number, ip: string | null, userAgent: string | null,
  browser: string, os: string, device: string, country: string, city: string | null, referrerUrl: string | null,
  referrerHost: string | null, landingPath: string, exitPath: string | null, hits: number, screenW: number | null,
  screenH: number | null, language: string | null, timezone: string | null, utmSource: string | null, utmMedium: string | null,
  utmCampaign: string | null, utmTerm: string | null, utmContent: string | null
}

export function listVisitorSessions(sqlite: Sqlite, limit = 50, offset = 0): VisitorSessionRow[] {
  return sqlite.prepare(`SELECT id, visitor_id AS visitorId, started_at AS startedAt, last_seen AS lastSeen, ip, user_agent AS userAgent, browser, os, device,
    country, city, referrer_url AS referrerUrl, referrer_host AS referrerHost, landing_path AS landingPath, exit_path AS exitPath, hits,
    screen_w AS screenW, screen_h AS screenH, language, timezone, utm_source AS utmSource, utm_medium AS utmMedium,
    utm_campaign AS utmCampaign, utm_term AS utmTerm, utm_content AS utmContent
    FROM visitor_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?`).all(Math.min(Math.max(1, limit), 200), Math.max(0, offset)) as VisitorSessionRow[]
}

export function sessionHits(sqlite: Sqlite, sid: string): Array<{ path: string, createdAt: number, dwellS: number | null, scrollMax: number }> {
  if (!isValidSessionId(sid)) return []
  return sqlite.prepare('SELECT path, created_at AS createdAt, dwell_s AS dwellS, scroll_max AS scrollMax FROM visitor_hits WHERE session_id = ? ORDER BY id').all(sid) as Array<{ path: string, createdAt: number, dwellS: number | null, scrollMax: number }>
}

export function sessionEvents(sqlite: Sqlite, sid: string): Array<{ path: string, kind: string, target: string, createdAt: number }> {
  if (!isValidSessionId(sid)) return []
  return sqlite.prepare('SELECT path, kind, target, created_at AS createdAt FROM visitor_events WHERE session_id = ? ORDER BY id').all(sid) as Array<{ path: string, kind: string, target: string, createdAt: number }>
}
