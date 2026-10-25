/**
 * Admin dashboard overview: SITE DATA ONLY (content, changelog, FAQ, strings,
 * drafts, audit log, own traffic counters, own health). No bot, Plex, Unraid or
 * Discord data, no external calls, no secrets: audit rows are read WITHOUT their
 * before/after snapshots. Takes a `sqlite` handle so it is unit-tested in memory.
 */

import type Database from 'better-sqlite3'
import { trafficReport } from './analytics'
import { visitorSummary } from './visitorReport'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

export const OVERVIEW_STALE_DAYS = 30
export const OVERVIEW_RECENT_LIMIT = 8
export const OVERVIEW_CACHE_MS = 10_000

export interface OverviewChange {
  id: number
  action: string
  entityType: string
  entityName: string
  actorName: string | null
  createdAt: number
}

export interface Overview {
  generatedAt: number
  counts: {
    contentPages: number
    contentCells: number
    changelogTotal: number
    changelogPublished: number
    faqTotal: number
    faqVisible: number
    profilesTotal: number
    profilesVisible: number
    wowupTotal: number
    wowupVisible: number
    layoutsTotal: number
    layoutsVisible: number
  }
  drafts: { cells: number, pages: string[] }
  changelog: { latestVersion: string | null, latestPublishedAt: number | null, hasUnreleased: boolean, unpublished: number }
  stale: { days: number, profiles: number, wowup: number, layouts: number }
  lastChange: {
    any: OverviewChange | null
    publishAt: number | null
    byType: Array<{ entityType: string, at: number, actorName: string | null }>
  }
  traffic: {
    views7d: number, viewsPrev7d: number, visitors7d: number
    copies7d: number, copiesPrev7d: number
    topCopied: Array<{ name: string, type: string, copies: number }>
  }
  health: {
    database: 'ok' | 'unavailable'
    dbSizeBytes: number | null
    uptimeSeconds: number
    build: { shortSha: string, buildTime: string }
    auditRows: number
    activityRows: number
  }
  /** Consented visitor log (visitor_sessions) next to the anonymous referrer counts, 30 days. Labelled by source in the UI. */
  visitors: {
    enabled: boolean
    sessions30d: number
    countries: Array<{ code: string, sessions: number }>
    referrers: Array<{ name: string, sessions: number }>
    anonymousReferrers: Array<{ name: string, views: number }>
  }
  recent: OverviewChange[]
}

export interface OverviewEnv {
  /** NUXT_VISITOR_LOG is on. */
  visitorLog?: boolean
  now?: number
  dbSizeBytes?: number | null
  uptimeSeconds?: number
  build?: { shortSha: string, buildTime: string }
}

function one<T>(sqlite: Sqlite, sql: string, ...args: unknown[]): T | undefined {
  return sqlite.prepare(sql).get(...args) as T | undefined
}
const num = (sqlite: Sqlite, sql: string, ...args: unknown[]) => one<{ n: number | null }>(sqlite, sql, ...args)?.n ?? 0

/** Trend helper kept pure for the UI and tests: +12, -5 or null without a baseline. */
export function trendPercent(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

type ChangeRow = { id: number, action: string, entity_type: string, entity_name: string, actor_name: string | null, created_at: number }
const toChange = (r: ChangeRow): OverviewChange => ({
  id: r.id, action: r.action, entityType: r.entity_type, entityName: r.entity_name, actorName: r.actor_name, createdAt: r.created_at,
})

export function buildOverview(sqlite: Sqlite, env: OverviewEnv = {}): Overview {
  const now = env.now ?? Math.floor(Date.now() / 1000)
  const week = 7 * 86400
  const staleBefore = now - OVERVIEW_STALE_DAYS * 86400
  // Own anonymous counters (utils/analytics.ts): last 7 UTC days incl. today vs. the 7 before; top copies over 30 days.
  const week7 = trafficReport(sqlite, 7, now)
  const prev7 = trafficReport(sqlite, 7, now - week)
  const month = trafficReport(sqlite, 30, now)
  const consented = visitorSummary(sqlite, 30, 5, now)

  let database: 'ok' | 'unavailable' = 'ok'
  try { sqlite.prepare('SELECT 1').get() } catch { database = 'unavailable' }

  const draftPages = (sqlite.prepare('SELECT DISTINCT page FROM content_drafts ORDER BY page').all() as Array<{ page: string }>).map(r => r.page)

  const latest = one<{ version: string, published_at: number | null }>(
    sqlite,
    "SELECT version, published_at FROM changelogs WHERE is_published = 1 AND version LIKE 'v%' ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT 1",
  )

  const lastAny = one<ChangeRow>(sqlite, 'SELECT id, action, entity_type, entity_name, actor_name, created_at FROM audit_changes ORDER BY created_at DESC, id DESC LIMIT 1')
  const publish = one<{ at: number | null }>(
    sqlite,
    "SELECT MAX(created_at) AS at FROM audit_changes WHERE entity_type = 'content' AND undo_of IS NULL AND entity_name LIKE '% published'",
  )
  const byType = (sqlite.prepare(
    `SELECT a.entity_type AS entity_type, a.created_at AS created_at, a.actor_name AS actor_name
     FROM audit_changes a
     JOIN (SELECT entity_type, MAX(id) AS id FROM audit_changes GROUP BY entity_type) m ON m.id = a.id
     ORDER BY a.created_at DESC, a.id DESC`,
  ).all() as Array<{ entity_type: string, created_at: number, actor_name: string | null }>)
    .map(r => ({ entityType: r.entity_type, at: r.created_at, actorName: r.actor_name }))

  const recent = (sqlite.prepare(
    'SELECT id, action, entity_type, entity_name, actor_name, created_at FROM audit_changes ORDER BY created_at DESC, id DESC LIMIT ?',
  ).all(OVERVIEW_RECENT_LIMIT) as ChangeRow[]).map(toChange)

  return {
    generatedAt: now,
    counts: {
      contentPages: num(sqlite, 'SELECT COUNT(DISTINCT page) AS n FROM site_content'),
      contentCells: num(sqlite, 'SELECT COUNT(*) AS n FROM site_content'),
      changelogTotal: num(sqlite, 'SELECT COUNT(*) AS n FROM changelogs'),
      changelogPublished: num(sqlite, 'SELECT COUNT(*) AS n FROM changelogs WHERE is_published = 1'),
      faqTotal: num(sqlite, 'SELECT COUNT(*) AS n FROM faqs'),
      faqVisible: num(sqlite, 'SELECT COUNT(*) AS n FROM faqs WHERE is_visible = 1'),
      profilesTotal: num(sqlite, 'SELECT COUNT(*) AS n FROM profiles'),
      profilesVisible: num(sqlite, 'SELECT COUNT(*) AS n FROM profiles WHERE is_visible = 1'),
      wowupTotal: num(sqlite, 'SELECT COUNT(*) AS n FROM wowup_strings'),
      wowupVisible: num(sqlite, 'SELECT COUNT(*) AS n FROM wowup_strings WHERE is_visible = 1'),
      layoutsTotal: num(sqlite, 'SELECT COUNT(*) AS n FROM character_layouts'),
      layoutsVisible: num(sqlite, 'SELECT COUNT(*) AS n FROM character_layouts WHERE is_visible = 1'),
    },
    drafts: { cells: num(sqlite, 'SELECT COUNT(*) AS n FROM content_drafts'), pages: draftPages },
    changelog: {
      latestVersion: latest?.version ?? null,
      latestPublishedAt: latest?.published_at ?? null,
      hasUnreleased: num(sqlite, "SELECT COUNT(*) AS n FROM changelogs WHERE version = 'Unreleased'") > 0,
      unpublished: num(sqlite, 'SELECT COUNT(*) AS n FROM changelogs WHERE is_published = 0 AND version <> \'Unreleased\''),
    },
    stale: {
      days: OVERVIEW_STALE_DAYS,
      profiles: num(sqlite, 'SELECT COUNT(*) AS n FROM profiles WHERE updated_at < ?', staleBefore),
      wowup: num(sqlite, 'SELECT COUNT(*) AS n FROM wowup_strings WHERE updated_at < ?', staleBefore),
      layouts: num(sqlite, 'SELECT COUNT(*) AS n FROM character_layouts WHERE updated_at < ?', staleBefore),
    },
    lastChange: { any: lastAny ? toChange(lastAny) : null, publishAt: publish?.at ?? null, byType },
    traffic: {
      views7d: week7.totals.views,
      viewsPrev7d: prev7.totals.views,
      visitors7d: week7.totals.visitors,
      copies7d: week7.totals.copies,
      copiesPrev7d: prev7.totals.copies,
      topCopied: month.copied.slice(0, 5).map(c => ({ name: c.name, type: c.type, copies: c.copies })),
    },
    health: {
      database,
      dbSizeBytes: env.dbSizeBytes ?? null,
      uptimeSeconds: env.uptimeSeconds ?? 0,
      build: env.build ?? { shortSha: 'dev', buildTime: 'dev' },
      auditRows: num(sqlite, 'SELECT COUNT(*) AS n FROM audit_changes'),
      activityRows: num(sqlite, 'SELECT COUNT(*) AS n FROM activity_log'),
    },
    visitors: {
      enabled: env.visitorLog === true,
      sessions30d: consented.sessions,
      countries: consented.countries,
      referrers: consented.referrers,
      anonymousReferrers: month.referrers.slice(0, 5).map(r => ({ name: r.name, views: r.views })),
    },
    recent,
  }
}

// ─── short server cache ─────────────────────────────────────────────────────

let cached: { at: number, value: Overview } | null = null

/** Cached for OVERVIEW_CACHE_MS; `fresh` (the Refresh button) bypasses it. */
export function getOverview(sqlite: Sqlite, env: OverviewEnv, fresh = false, nowMs = Date.now()): Overview {
  if (!fresh && cached && nowMs - cached.at < OVERVIEW_CACHE_MS) return cached.value
  const value = buildOverview(sqlite, env)
  cached = { at: nowMs, value }
  return value
}

export function resetOverviewCache() { cached = null }
