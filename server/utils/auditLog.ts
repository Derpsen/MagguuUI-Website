/**
 * Admin audit log: who changed what, with a redacted before/after snapshot,
 * and a conflict-checked undo for the entities where restoring is safe
 * (content cells, changelog entries, FAQ entries).
 *
 * Plain better-sqlite3 (a `sqlite` handle is passed in) so the logic runs in
 * handlers and in unit tests against an in-memory database. Writes are
 * best-effort in handlers (`recordAuditSafe`): an audit failure must never fail
 * the admin action itself. Secrets never reach this table: see auditRedact.ts.
 */
import type Database from 'better-sqlite3'
import { containsRedaction, redactAuditValue, redactToJson } from './auditRedact'
import { applyContentItems } from './contentDrafts'
import type { ContentChange } from './contentDrafts'
import { isHtmlCopyKey } from '../../utils/pageCopyDefaults'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

export type AuditAction = 'created' | 'updated' | 'deleted'
export const AUDIT_TYPES = ['content', 'changelog', 'faq', 'setting', 'profile', 'wowup', 'layout', 'addon', 'status_notice', 'community_preset'] as const
export type AuditType = typeof AUDIT_TYPES[number]
export const UNDOABLE_TYPES: readonly string[] = ['content', 'changelog', 'faq']

export const AUDIT_MAX_ROWS = 5000
export const AUDIT_MAX_AGE_DAYS = 90

export interface AuditInput {
  action: AuditAction
  entityType: AuditType
  entityId?: number | null
  entityKey?: string | null
  entityName: string
  before?: unknown
  after?: unknown
  userId?: number | null
  /** Redact by object-key name (default). Content cells use neutral keys, so they turn it off. */
  redactKeys?: boolean
  undoOf?: number | null
}

export interface AuditRow {
  id: number
  action: AuditAction
  entityType: string
  entityId: number | null
  entityKey: string | null
  entityName: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  userId: number | null
  actorName: string | null
  undoOf: number | null
  undoneBy: number | null
  createdAt: number
  undoable: boolean
}

export class AuditUndoError extends Error {
  constructor(public code: 'not_found' | 'not_undoable' | 'conflict', message: string, public status: number) {
    super(message)
  }
}

/** Stable JSON (sorted keys) for comparing snapshots. */
export function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

const seconds = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return Math.floor(v.getTime() / 1000)
  return Number(v)
}

/** Snapshot of a changelog row (drizzle or raw sqlite shape). */
export function changelogSnapshot(row: Record<string, unknown>) {
  return {
    version: String(row.version ?? ''),
    content: String(row.content ?? ''),
    contentEn: row.contentEn === null || row.contentEn === undefined ? null : String(row.contentEn),
    isPublished: Boolean(row.isPublished),
    publishedAt: seconds(row.publishedAt),
    createdAt: seconds(row.createdAt),
  }
}

export function faqSnapshot(row: Record<string, unknown>) {
  return {
    category: String(row.category ?? ''),
    question: String(row.question ?? ''),
    answer: String(row.answer ?? ''),
    sortOrder: Number(row.sortOrder ?? 0),
    isVisible: Boolean(row.isVisible),
    createdAt: seconds(row.createdAt),
  }
}

/** Generic row snapshot for audit-only entities (profiles, WowUp strings, layouts): no timestamps noise. */
export function rowSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'updatedAt') continue
    out[k] = v instanceof Date ? Math.floor(v.getTime() / 1000) : v
  }
  return out
}

const CHANGELOG_SQL = 'SELECT version, content, content_en AS contentEn, is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt FROM changelogs WHERE id = ?'
const FAQ_SQL = 'SELECT category, question, answer, sort_order AS sortOrder, is_visible AS isVisible, created_at AS createdAt FROM faqs WHERE id = ?'

// ─── content cells ────────────────────────────────────────────────────────

export const cellId = (c: Pick<ContentChange, 'page' | 'section' | 'key' | 'locale'>) =>
  `${c.page}/${c.section}/${c.key}${c.locale && c.locale !== 'en' ? `@${c.locale}` : ''}`

export function parseCellId(id: string): { page: string, section: string, key: string, locale: string } | null {
  const at = id.lastIndexOf('@')
  const locale = at > 0 ? id.slice(at + 1) : 'en'
  const path = at > 0 ? id.slice(0, at) : id
  const parts = path.split('/')
  if (parts.length !== 3 || parts.some(p => !p) || !/^[a-z-]{2,10}$/i.test(locale)) return null
  return { page: parts[0]!, section: parts[1]!, key: parts[2]!, locale }
}

/** One audit row per content write: before/after maps of the changed cells only. */
export function recordContentAudit(sqlite: Sqlite, changes: ContentChange[], name: string, userId?: number | null, undoOf?: number | null): number | null {
  if (!changes.length) return null
  const before: Record<string, string | null> = {}
  const after: Record<string, string | null> = {}
  for (const c of changes) {
    before[cellId(c)] = c.before
    after[cellId(c)] = c.after
  }
  const pages = [...new Set(changes.map(c => c.page))].join(', ')
  return recordAuditChange(sqlite, {
    action: 'updated', entityType: 'content', entityKey: pages, entityName: name,
    before, after, userId, redactKeys: false, undoOf,
  })
}

// ─── record / prune ───────────────────────────────────────────────────────

export function pruneAudit(sqlite: Sqlite, opts: { maxRows?: number, maxAgeDays?: number, now?: number } = {}): number {
  const maxRows = opts.maxRows ?? AUDIT_MAX_ROWS
  const cutoff = (opts.now ?? Math.floor(Date.now() / 1000)) - (opts.maxAgeDays ?? AUDIT_MAX_AGE_DAYS) * 86400
  const byAge = sqlite.prepare('DELETE FROM audit_changes WHERE created_at < ?').run(cutoff).changes
  const byCount = sqlite.prepare(
    'DELETE FROM audit_changes WHERE id <= (SELECT id FROM audit_changes ORDER BY id DESC LIMIT 1 OFFSET ?)',
  ).run(maxRows).changes
  return byAge + byCount
}

export function recordAuditChange(sqlite: Sqlite, input: AuditInput): number | null {
  const redactKeys = input.redactKeys !== false
  const beforeJson = redactToJson(input.before, redactKeys)
  const afterJson = redactToJson(input.after, redactKeys)
  if (beforeJson === afterJson) return null // nothing changed
  const actor = input.userId
    ? (sqlite.prepare('SELECT username FROM users WHERE id = ?').get(input.userId) as { username: string } | undefined)?.username ?? null
    : null
  const info = sqlite.prepare(
    `INSERT INTO audit_changes (action, entity_type, entity_id, entity_key, entity_name, before_json, after_json, user_id, actor_name, undo_of)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.action, input.entityType, input.entityId ?? null, input.entityKey ?? null,
    String(redactAuditValue(input.entityName, false)).slice(0, 200), beforeJson, afterJson,
    input.userId ?? null, actor, input.undoOf ?? null,
  )
  pruneAudit(sqlite)
  return Number(info.lastInsertRowid)
}

/** Handler-side wrapper: audit problems are logged, never thrown. */
export function recordAuditSafe(sqlite: Sqlite, input: AuditInput): number | null {
  try {
    return recordAuditChange(sqlite, input)
  } catch (e) {
    console.error('[Audit] record failed:', e instanceof Error ? e.message : e)
    return null
  }
}

// ─── list ─────────────────────────────────────────────────────────────────

export interface AuditFilters {
  type?: string
  action?: string
  search?: string
  actor?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

interface RawRow {
  id: number, action: AuditAction, entity_type: string, entity_id: number | null, entity_key: string | null,
  entity_name: string, before_json: string | null, after_json: string | null, user_id: number | null,
  actor_name: string | null, undo_of: number | null, undone_by: number | null, created_at: number
}

const parse = (json: string | null): Record<string, unknown> | null => {
  if (!json) return null
  try {
    const v = JSON.parse(json)
    // Defense in depth: scrub again on the way out.
    return v && typeof v === 'object' ? redactAuditValue(v, false) as Record<string, unknown> : null
  } catch { return null }
}

function toRow(r: RawRow): AuditRow {
  const before = parse(r.before_json)
  const undoable = UNDOABLE_TYPES.includes(r.entity_type) && !r.undone_by && !r.undo_of
    && (r.action === 'created' || !containsRedaction(before))
  return {
    id: r.id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, entityKey: r.entity_key,
    entityName: r.entity_name, before, after: parse(r.after_json), userId: r.user_id, actorName: r.actor_name,
    undoOf: r.undo_of, undoneBy: r.undone_by, createdAt: r.created_at, undoable,
  }
}

export function listAudit(sqlite: Sqlite, f: AuditFilters = {}): { items: AuditRow[], total: number, page: number, totalPages: number } {
  const where: string[] = []
  const args: unknown[] = []
  if (f.type && (AUDIT_TYPES as readonly string[]).includes(f.type)) { where.push('entity_type = ?'); args.push(f.type) }
  if (f.action && ['created', 'updated', 'deleted'].includes(f.action)) { where.push('action = ?'); args.push(f.action) }
  if (f.actor) { where.push('actor_name LIKE ?'); args.push(`%${f.actor.replace(/[%_]/g, '')}%`) }
  if (f.search) {
    const p = `%${f.search.replace(/[%_]/g, '')}%`
    where.push('(entity_name LIKE ? OR entity_key LIKE ? OR before_json LIKE ? OR after_json LIKE ?)')
    args.push(p, p, p, p)
  }
  const from = f.dateFrom ? Math.floor(new Date(`${f.dateFrom}T00:00:00Z`).getTime() / 1000) : NaN
  const to = f.dateTo ? Math.floor(new Date(`${f.dateTo}T23:59:59Z`).getTime() / 1000) : NaN
  if (!Number.isNaN(from)) { where.push('created_at >= ?'); args.push(from) }
  if (!Number.isNaN(to)) { where.push('created_at <= ?'); args.push(to) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(Math.max(1, Number(f.limit) || 25), 100)
  const page = Math.max(1, Number(f.page) || 1)
  const total = (sqlite.prepare(`SELECT count(*) AS n FROM audit_changes ${clause}`).get(...args) as { n: number }).n
  const rows = sqlite.prepare(`SELECT * FROM audit_changes ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args, limit, (page - 1) * limit) as RawRow[]
  return { items: rows.map(toRow), total, page, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

// ─── undo ─────────────────────────────────────────────────────────────────

const conflict = (what: string) =>
  new AuditUndoError('conflict', `${what} was changed after this entry. Undo refused to avoid overwriting newer edits.`, 409)

type Snap = Record<string, unknown>

/**
 * Restore the before-state of an entry as a NEW audited action. Refuses when
 * the entity no longer matches the entry's after-state (conflict), when the
 * entry was already undone, is itself an undo, or lost data to redaction.
 */
export function undoAuditChange(sqlite: Sqlite, id: number, userId?: number | null): AuditRow {
  const raw = sqlite.prepare('SELECT * FROM audit_changes WHERE id = ?').get(id) as RawRow | undefined
  if (!raw) throw new AuditUndoError('not_found', 'Audit entry not found', 404)
  const row = toRow(raw)
  if (!UNDOABLE_TYPES.includes(row.entityType)) throw new AuditUndoError('not_undoable', `${row.entityType} changes cannot be undone from the log`, 422)
  if (row.undoneBy) throw new AuditUndoError('not_undoable', 'This entry was already undone', 422)
  if (row.undoOf) throw new AuditUndoError('not_undoable', 'An undo cannot be undone; edit the entry instead', 422)
  if (row.action !== 'created' && containsRedaction(row.before)) {
    throw new AuditUndoError('not_undoable', 'The before-state contains redacted or truncated data and cannot be restored', 422)
  }

  let newId: number | null = null
  sqlite.transaction(() => {
    if (row.entityType === 'content') newId = undoContent(sqlite, row, userId)
    else newId = undoEntity(sqlite, row, userId)
    if (!newId) throw new AuditUndoError('not_undoable', 'Nothing to restore', 422) // rolls the restore back
    sqlite.prepare('UPDATE audit_changes SET undone_by = ? WHERE id = ?').run(newId, row.id)
  })()
  const created = sqlite.prepare('SELECT * FROM audit_changes WHERE id = ?').get(newId) as RawRow
  return toRow(created)
}

function undoContent(sqlite: Sqlite, row: AuditRow, userId?: number | null): number | null {
  const before = (row.before || {}) as Record<string, string | null>
  const after = (row.after || {}) as Record<string, string | null>
  const find = sqlite.prepare('SELECT value FROM site_content WHERE page = ? AND section = ? AND key = ? AND locale = ?')
  const items: Array<{ page: string, section: string, key: string, locale: string, value: string, type: string }> = []
  for (const [cell, afterValue] of Object.entries(after)) {
    const c = parseCellId(cell)
    if (!c) throw new AuditUndoError('not_undoable', 'Unrecognised content cell in this entry', 422)
    const current = (find.get(c.page, c.section, c.key, c.locale) as { value: string } | undefined)?.value ?? null
    if ((current ?? null) !== (afterValue ?? null)) throw conflict(`"${cell}"`)
    items.push({ ...c, value: before[cell] ?? '', type: isHtmlCopyKey(c.key) ? 'html' : 'text' })
  }
  if (!items.length) return null
  const changes = applyContentItems(sqlite, items, userId ?? undefined)
  return recordContentAudit(sqlite, changes, `${row.entityName} (undo #${row.id})`, userId, row.id)
}

function undoEntity(sqlite: Sqlite, row: AuditRow, userId?: number | null): number | null {
  const isChangelog = row.entityType === 'changelog'
  const table = isChangelog ? 'changelogs' : 'faqs'
  const sql = isChangelog ? CHANGELOG_SQL : FAQ_SQL
  const snap = (r: Record<string, unknown>): Snap => isChangelog ? changelogSnapshot(r) : faqSnapshot(r)
  const entityId = row.entityId
  if (!entityId) throw new AuditUndoError('not_undoable', 'Entry has no entity id', 422)
  const currentRaw = sqlite.prepare(sql).get(entityId) as Record<string, unknown> | undefined
  const current = currentRaw ? snap(currentRaw) : null
  const label = isChangelog ? 'This changelog entry' : 'This FAQ entry'

  if (row.action === 'deleted') {
    if (current) throw conflict(label)
    const b = row.before as Snap | null
    if (!b) throw new AuditUndoError('not_undoable', 'No before-state stored', 422)
    if (isChangelog) {
      sqlite.prepare('INSERT INTO changelogs (id, version, content, content_en, is_published, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(entityId, b.version, b.content, b.contentEn ?? null, b.isPublished ? 1 : 0, b.publishedAt ?? null, b.createdAt ?? Math.floor(Date.now() / 1000))
    } else {
      sqlite.prepare('INSERT INTO faqs (id, category, question, answer, sort_order, is_visible, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(entityId, b.category, b.question, b.answer, b.sortOrder ?? 0, b.isVisible ? 1 : 0, b.createdAt ?? Math.floor(Date.now() / 1000))
    }
    const restored = snap(sqlite.prepare(sql).get(entityId) as Record<string, unknown>)
    return recordAuditChange(sqlite, { action: 'created', entityType: row.entityType as AuditType, entityId, entityName: `${row.entityName} (undo #${row.id})`, before: null, after: restored, userId, undoOf: row.id })
  }

  if (!current) throw conflict(label)
  if (canon(redactAuditValue(current, true)) !== canon(row.after)) throw conflict(label)

  if (row.action === 'created') {
    sqlite.prepare(`DELETE FROM ${table} WHERE id = ?`).run(entityId)
    return recordAuditChange(sqlite, { action: 'deleted', entityType: row.entityType as AuditType, entityId, entityName: `${row.entityName} (undo #${row.id})`, before: current, after: null, userId, undoOf: row.id })
  }

  const b = row.before as Snap | null
  if (!b) throw new AuditUndoError('not_undoable', 'No before-state stored', 422)
  if (isChangelog) {
    sqlite.prepare('UPDATE changelogs SET version = ?, content = ?, content_en = ?, is_published = ?, published_at = ?, updated_at = unixepoch() WHERE id = ?')
      .run(b.version, b.content, b.contentEn ?? null, b.isPublished ? 1 : 0, b.publishedAt ?? null, entityId)
  } else {
    sqlite.prepare('UPDATE faqs SET category = ?, question = ?, answer = ?, sort_order = ?, is_visible = ?, updated_at = unixepoch() WHERE id = ?')
      .run(b.category, b.question, b.answer, b.sortOrder ?? 0, b.isVisible ? 1 : 0, entityId)
  }
  const restored = snap(sqlite.prepare(sql).get(entityId) as Record<string, unknown>)
  return recordAuditChange(sqlite, { action: 'updated', entityType: row.entityType as AuditType, entityId, entityName: `${row.entityName} (undo #${row.id})`, before: current, after: restored, userId, undoOf: row.id })
}
