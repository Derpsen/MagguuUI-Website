/**
 * Storage, validation and state rules for status notices (item B): the
 * admin-written maintenance / incident notices on the public /status page.
 *
 * Plain better-sqlite3 (a handle is passed in), so it runs in handlers and in unit
 * tests against an in-memory database. Relative imports only (no Nitro auto-imports).
 *
 * Model: `status_notices` (one row per notice, Markdown body) and the append-only
 * `status_notice_updates` timeline (rows are only ever inserted; deleting a notice
 * removes its timeline with it). Status flow:
 *   scheduled   -> in_progress | resolved (cancelled)
 *   in_progress -> monitoring | resolved
 *   monitoring  -> in_progress | resolved
 *   resolved    -> in_progress (reopen)
 * Incidents are never `scheduled`. Public output goes through `toPublicNotice`
 * (server/utils/statusNotices.ts), which is the whitelist; this file never renders HTML.
 */
import type Database from 'better-sqlite3'
import { z } from 'zod'
import { NOTICE_COMPONENT_IDS, NOTICE_KINDS, NOTICE_STATUSES, canTransition } from '../../utils/publicStatus'
import type { StatusComponentId, StatusNoticeKind, StatusNoticeStatus } from '../../utils/publicStatus'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

const DAY = 86400

export const NOTICE_TITLE_MAX = 120
export const NOTICE_BODY_MAX = 2000
export const NOTICE_UPDATE_MAX = 1000
export const MAX_UPDATES_PER_NOTICE = 50
export const MAX_NOTICE_ROWS = 500
/** Resolved notices stay on the public page for this long. */
export const HISTORY_DAYS = 90
/** Resolved notices are deleted after this long. */
export const RESOLVED_KEEP_DAYS = 365

export class NoticeError extends Error {
  constructor(public code: 'not_found' | 'invalid' | 'conflict', message: string, public status: number) {
    super(message)
  }
}

// ─── Validation ────────────────────────────────────────────────────────

const stripControls = (s: string, keepNewlines: boolean) =>
  [...s].map((c) => {
    const n = c.charCodeAt(0)
    if (keepNewlines && (c === '\n' || c === '\t')) return c
    return n < 32 || n === 127 ? ' ' : c
  }).join('')

const titleField = z.string().max(NOTICE_TITLE_MAX * 2)
  .transform(s => stripControls(s, false).replace(/\s+/g, ' ').trim())
  .refine(s => s.length >= 1, 'Title is required')
  .refine(s => s.length <= NOTICE_TITLE_MAX, `Title must be at most ${NOTICE_TITLE_MAX} characters`)

const bodyField = (max: number) => z.string().max(max * 2)
  .transform(s => stripControls(s.replace(/\r\n?/g, '\n'), true).trim())
  .refine(s => s.length <= max, `Text must be at most ${max} characters`)

const MIN_TIME = Date.UTC(2020, 0, 1) / 1000
const MAX_TIME = Date.UTC(2100, 0, 1) / 1000
const whenField = z.string().max(40).transform((s, ctx) => {
  const ms = Date.parse(s)
  const sec = Math.floor(ms / 1000)
  if (Number.isNaN(ms) || sec < MIN_TIME || sec > MAX_TIME) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date' })
    return z.NEVER
  }
  return sec
})

const kindField = z.enum(NOTICE_KINDS as [StatusNoticeKind, ...StatusNoticeKind[]])
const statusField = z.enum(NOTICE_STATUSES as [StatusNoticeStatus, ...StatusNoticeStatus[]])
const componentField = z.enum(NOTICE_COMPONENT_IDS as [StatusComponentId, ...StatusComponentId[]]).nullable()

export const noticeCreateSchema = z.object({
  kind: kindField,
  title: titleField,
  body: bodyField(NOTICE_BODY_MAX).optional().default(''),
  component: componentField.optional().default(null),
  startsAt: whenField,
  endsAt: whenField.nullable().optional().default(null),
  status: statusField.optional(),
}).strict()

export const noticeEditSchema = z.object({
  kind: kindField.optional(),
  title: titleField.optional(),
  body: bodyField(NOTICE_BODY_MAX).optional(),
  component: componentField.optional(),
  startsAt: whenField.optional(),
  endsAt: whenField.nullable().optional(),
}).strict()

export const noticeEntrySchema = z.object({
  status: statusField.optional(),
  body: bodyField(NOTICE_UPDATE_MAX).optional().default(''),
}).strict()

export type NoticeCreateInput = z.output<typeof noticeCreateSchema>
export type NoticeEditInput = z.output<typeof noticeEditSchema>
export type NoticeEntryInput = z.output<typeof noticeEntrySchema>

// ─── State rules ───────────────────────────────────────────────────────

export { canTransition }

/** Incidents start in progress; a maintenance window starts scheduled while it lies ahead. */
export function initialStatus(kind: StatusNoticeKind, startsAt: number, now: number, requested?: StatusNoticeStatus): StatusNoticeStatus {
  if (requested) {
    if (kind === 'incident' && requested === 'scheduled') throw new NoticeError('invalid', 'An incident cannot be scheduled', 422)
    return requested
  }
  return kind === 'maintenance' && startsAt > now ? 'scheduled' : 'in_progress'
}

function checkWindow(startsAt: number, endsAt: number | null): void {
  if (endsAt !== null && endsAt <= startsAt) throw new NoticeError('invalid', 'The end must be after the start', 422)
}

// ─── Rows ──────────────────────────────────────────────────────────────

interface NoticeRow {
  id: number
  kind: StatusNoticeKind
  status: StatusNoticeStatus
  title: string
  body: string
  component: StatusComponentId | null
  starts_at: number
  ends_at: number | null
  resolved_at: number | null
  created_at: number
  updated_at: number
}
interface UpdateRow { id: number, notice_id: number, status: StatusNoticeStatus, body: string, created_at: number }

export interface AdminNoticeUpdate { id: number, status: StatusNoticeStatus, body: string, at: string }
export interface AdminNotice {
  id: number
  kind: StatusNoticeKind
  status: StatusNoticeStatus
  title: string
  body: string
  component: StatusComponentId | null
  startsAt: string
  endsAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  updates: AdminNoticeUpdate[]
}

const iso = (sec: number) => new Date(sec * 1000).toISOString()
const isoOrNull = (sec: number | null) => sec === null || sec === undefined ? null : iso(sec)

const NOTICE_COLUMNS = 'id, kind, status, title, body, component, starts_at, ends_at, resolved_at, created_at, updated_at'

function toAdmin(row: NoticeRow, updates: UpdateRow[]): AdminNotice {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    body: row.body,
    component: row.component,
    startsAt: iso(row.starts_at),
    endsAt: isoOrNull(row.ends_at),
    resolvedAt: isoOrNull(row.resolved_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    updates: updates.map(u => ({ id: u.id, status: u.status, body: u.body, at: iso(u.created_at) })),
  }
}

function updatesOf(sqlite: Sqlite, id: number): UpdateRow[] {
  return sqlite.prepare('SELECT id, notice_id, status, body, created_at FROM status_notice_updates WHERE notice_id = ? ORDER BY id').all(id) as UpdateRow[]
}

export function getStatusNotice(sqlite: Sqlite, id: number): AdminNotice | null {
  const row = sqlite.prepare(`SELECT ${NOTICE_COLUMNS} FROM status_notices WHERE id = ?`).get(id) as NoticeRow | undefined
  return row ? toAdmin(row, updatesOf(sqlite, id)) : null
}

/** Newest first; capped (the table is capped as well). */
export function listAdminStatusNotices(sqlite: Sqlite, limit = MAX_NOTICE_ROWS): AdminNotice[] {
  const rows = sqlite.prepare(`SELECT ${NOTICE_COLUMNS} FROM status_notices ORDER BY starts_at DESC, id DESC LIMIT ?`).all(limit) as NoticeRow[]
  if (!rows.length) return []
  const byNotice = new Map<number, UpdateRow[]>()
  const all = sqlite.prepare('SELECT id, notice_id, status, body, created_at FROM status_notice_updates ORDER BY id').all() as UpdateRow[]
  for (const u of all) byNotice.set(u.notice_id, [...(byNotice.get(u.notice_id) ?? []), u])
  return rows.map(r => toAdmin(r, byNotice.get(r.id) ?? []))
}

/** Redacted-by-design snapshot for the audit log (no ids of rows that do not matter, no secrets exist here). */
export function noticeSnapshot(n: AdminNotice) {
  return {
    kind: n.kind,
    status: n.status,
    title: n.title,
    body: n.body,
    component: n.component,
    startsAt: n.startsAt,
    endsAt: n.endsAt,
    resolvedAt: n.resolvedAt,
    updates: n.updates.map(u => ({ at: u.at, status: u.status, body: u.body })),
  }
}

// ─── Writes ────────────────────────────────────────────────────────────

export function createStatusNotice(sqlite: Sqlite, input: NoticeCreateInput, userId: number | null, now: number = Math.floor(Date.now() / 1000)): AdminNotice {
  checkWindow(input.startsAt, input.endsAt)
  const total = (sqlite.prepare('SELECT COUNT(*) AS n FROM status_notices').get() as { n: number }).n
  if (total >= MAX_NOTICE_ROWS) throw new NoticeError('conflict', `At most ${MAX_NOTICE_ROWS} notices are kept; delete old ones first`, 409)
  const status = initialStatus(input.kind, input.startsAt, now, input.status)
  const info = sqlite.prepare(
    `INSERT INTO status_notices (kind, status, title, body, component, starts_at, ends_at, resolved_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(input.kind, status, input.title, input.body, input.component, input.startsAt, input.endsAt, status === 'resolved' ? now : null, userId, now, now)
  return getStatusNotice(sqlite, Number(info.lastInsertRowid))!
}

export function updateStatusNotice(sqlite: Sqlite, id: number, patch: NoticeEditInput, now: number = Math.floor(Date.now() / 1000)): { before: AdminNotice, after: AdminNotice } {
  const before = getStatusNotice(sqlite, id)
  if (!before) throw new NoticeError('not_found', 'Notice not found', 404)
  const kind = patch.kind ?? before.kind
  if (kind === 'incident' && before.status === 'scheduled') throw new NoticeError('invalid', 'An incident cannot be scheduled; change the status first', 422)
  const startsAt = patch.startsAt ?? Math.floor(Date.parse(before.startsAt) / 1000)
  const endsAt = patch.endsAt !== undefined ? patch.endsAt : (before.endsAt ? Math.floor(Date.parse(before.endsAt) / 1000) : null)
  checkWindow(startsAt, endsAt)
  sqlite.prepare('UPDATE status_notices SET kind = ?, title = ?, body = ?, component = ?, starts_at = ?, ends_at = ?, updated_at = ? WHERE id = ?')
    .run(kind, patch.title ?? before.title, patch.body ?? before.body, patch.component !== undefined ? patch.component : before.component, startsAt, endsAt, now, id)
  return { before, after: getStatusNotice(sqlite, id)! }
}

/**
 * Appends one timeline entry, optionally moving the notice to a new status. Append-only:
 * an entry can never be edited or removed. Needs text or a status change.
 */
export function appendStatusNoticeUpdate(sqlite: Sqlite, id: number, input: NoticeEntryInput, userId: number | null, now: number = Math.floor(Date.now() / 1000)): { before: AdminNotice, after: AdminNotice } {
  const before = getStatusNotice(sqlite, id)
  if (!before) throw new NoticeError('not_found', 'Notice not found', 404)
  const next = input.status && input.status !== before.status ? input.status : null
  if (!next && !input.body) throw new NoticeError('invalid', 'Add text or change the status', 422)
  if (next && !canTransition(before.status, next)) {
    throw new NoticeError('invalid', `A notice cannot go from "${before.status}" to "${next}"`, 422)
  }
  if (next === 'scheduled') throw new NoticeError('invalid', 'A notice cannot be moved back to scheduled', 422)
  if (before.updates.length >= MAX_UPDATES_PER_NOTICE) throw new NoticeError('conflict', `At most ${MAX_UPDATES_PER_NOTICE} updates per notice`, 409)

  sqlite.transaction(() => {
    sqlite.prepare('INSERT INTO status_notice_updates (notice_id, status, body, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, next ?? before.status, input.body, userId, now)
    if (next) {
      sqlite.prepare('UPDATE status_notices SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?')
        .run(next, next === 'resolved' ? now : null, now, id)
    } else {
      sqlite.prepare('UPDATE status_notices SET updated_at = ? WHERE id = ?').run(now, id)
    }
  })()
  return { before, after: getStatusNotice(sqlite, id)! }
}

export function deleteStatusNotice(sqlite: Sqlite, id: number): AdminNotice {
  const before = getStatusNotice(sqlite, id)
  if (!before) throw new NoticeError('not_found', 'Notice not found', 404)
  sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM status_notice_updates WHERE notice_id = ?').run(id)
    sqlite.prepare('DELETE FROM status_notices WHERE id = ?').run(id)
  })()
  return before
}

/** Retention: resolved notices older than a year (and their timelines) go. Returns the number removed. */
export function pruneStatusNotices(sqlite: Sqlite, now: number = Math.floor(Date.now() / 1000)): number {
  const cutoff = now - RESOLVED_KEEP_DAYS * DAY
  let removed = 0
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM status_notice_updates WHERE notice_id IN (SELECT id FROM status_notices WHERE status = 'resolved' AND resolved_at < ?)").run(cutoff)
    removed = sqlite.prepare("DELETE FROM status_notices WHERE status = 'resolved' AND resolved_at < ?").run(cutoff).changes
  })()
  return removed
}

// ─── Public source ─────────────────────────────────────────────────────

/**
 * Raw rows for the notice registry: everything not resolved plus what was resolved in
 * the last 90 days. The registry's `toPublicNotice` is the whitelist and renders the Markdown.
 */
export function publicNoticeRows(sqlite: Sqlite, now: number = Math.floor(Date.now() / 1000)): unknown[] {
  const rows = sqlite.prepare(
    `SELECT ${NOTICE_COLUMNS} FROM status_notices
     WHERE status != 'resolved' OR resolved_at >= ?
     ORDER BY id DESC LIMIT 100`,
  ).all(now - HISTORY_DAYS * DAY) as NoticeRow[]
  if (!rows.length) return []
  const ids = rows.map(r => r.id)
  const marks = ids.map(() => '?').join(',')
  const updates = sqlite.prepare(`SELECT id, notice_id, status, body, created_at FROM status_notice_updates WHERE notice_id IN (${marks}) ORDER BY id`).all(...ids) as UpdateRow[]
  const by = new Map<number, UpdateRow[]>()
  for (const u of updates) by.set(u.notice_id, [...(by.get(u.notice_id) ?? []), u])
  return rows.map(r => ({
    id: String(r.id),
    kind: r.kind,
    status: r.status,
    title: r.title,
    body: r.body,
    component: r.component,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    resolvedAt: r.resolved_at,
    updates: (by.get(r.id) ?? []).map(u => ({ at: u.created_at, status: u.status, body: u.body })),
  }))
}
