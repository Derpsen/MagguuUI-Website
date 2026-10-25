/**
 * Request flow of the admin Visitors view (pure: h3 and relative imports only, unit tested with a real h3 app).
 * The route files in server/api/v1/admin/visitors only wire in the runtime (admin guard, database, audit, flag).
 *
 *   GET /api/v1/admin/visitors            filtered, paginated sessions + filter choices + flag status
 *   GET /api/v1/admin/visitors/:id        path of one session (pages, dwell, scroll) and its clicks
 *   GET /api/v1/admin/visitors/export     CSV of the filtered view (capped, formula-safe, audited, no payload in the audit)
 *
 * Every handler runs the admin guard FIRST and answers with Cache-Control: no-store.
 */
import type { H3Event } from 'h3'
import { createError, getQuery, getRouterParam, sendStream, setResponseHeader } from 'h3'
import { Readable } from 'node:stream'
import {
  VISITOR_EXPORT_MAX_ROWS, parseVisitorFilters, queryVisitorSessions, visitorCsvChunks, visitorDetail, visitorFilterOptions,
  type VisitorFilters,
} from './visitorReport'
import type Database from 'better-sqlite3'

export interface VisitorAdminDeps {
  /** Throws a 401/403 createError for anyone but an admin; returns the admin's user id. */
  requireAdmin: (event: H3Event) => { userId?: number | null }
  sqlite: Pick<Database.Database, 'prepare' | 'transaction'>
  /** Whether NUXT_VISITOR_LOG is on (shown in the empty state). */
  enabled: () => boolean
  /** Audit entry for an export; counts and the NAMES of the active filters only. MUST throw when it cannot be written: the export then fails closed. */
  audit: (entry: { userId: number | null, rows: number, filters: string[] }) => void
  now?: () => number
}

const noStore = (event: H3Event) => setResponseHeader(event, 'Cache-Control', 'no-store')
const nowS = (d: VisitorAdminDeps) => (d.now ? d.now() : Math.floor(Date.now() / 1000))

/** Names of the filters that differ from "no filter" (the audit never stores their values). */
export function activeFilterNames(f: VisitorFilters): string[] {
  const names: string[] = []
  if (f.country) names.push('country')
  if (f.page) names.push('page')
  if (f.referrer) names.push('referrer')
  if (f.utm) names.push('utm')
  if (f.visitor) names.push('visitor')
  names.push(f.days ? `days=${f.days}` : 'days=all')
  return names
}

export function handleVisitorList(event: H3Event, deps: VisitorAdminDeps) {
  deps.requireAdmin(event)
  noStore(event)
  const q = getQuery(event)
  const filters = parseVisitorFilters(q)
  const result = queryVisitorSessions(deps.sqlite, filters, Number(q.page) || 1, Number(q.limit) || undefined, nowS(deps))
  const total = (deps.sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_sessions').get() as { n: number }).n
  return { success: true, data: { ...result, filters, options: visitorFilterOptions(deps.sqlite), enabled: deps.enabled(), storedSessions: total } }
}

export function handleVisitorDetail(event: H3Event, deps: VisitorAdminDeps) {
  deps.requireAdmin(event)
  noStore(event)
  const detail = visitorDetail(deps.sqlite, String(getRouterParam(event, 'id') || ''))
  if (!detail) throw createError({ statusCode: 404, message: 'Session not found' })
  return { success: true, data: detail }
}

export function handleVisitorExport(event: H3Event, deps: VisitorAdminDeps) {
  const admin = deps.requireAdmin(event)
  const filters = parseVisitorFilters(getQuery(event))
  noStore(event)
  // The audit entry is written BEFORE any data leaves, with the row count (never the data itself). If it cannot be
  // written the export is refused (fail closed), and no CSV header has been set yet.
  const total = queryVisitorSessions(deps.sqlite, filters, 1, 1, nowS(deps)).total
  try {
    deps.audit({ userId: admin.userId ?? null, rows: Math.min(total, VISITOR_EXPORT_MAX_ROWS), filters: activeFilterNames(filters) })
  } catch (e) {
    console.error('[Visitors] export refused, audit entry not written:', e instanceof Error ? e.message : e)
    throw createError({ statusCode: 500, message: 'Export refused: the audit entry could not be written' })
  }
  const stamp = new Date(nowS(deps) * 1000).toISOString().slice(0, 10)
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="visitors-${stamp}.csv"`)
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  // UTF-8 BOM so Excel opens non-ASCII city names correctly.
  const stream = Readable.from((function* () { yield '\uFEFF'; yield* visitorCsvChunks(deps.sqlite, filters, nowS(deps)) })())
  return sendStream(event, stream)
}
