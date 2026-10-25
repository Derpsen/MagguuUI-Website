/**
 * Content drafts: unpublished admin edits of site_content cells.
 *
 * Plain better-sqlite3 so the same code runs in the API handlers and in unit
 * tests against an in-memory database. Drafts live in `content_drafts` and are
 * never read by public endpoints; Publish promotes them into `site_content`
 * (writing `content_revisions` like every other admin save) and removes them.
 */
import type Database from 'better-sqlite3'

export interface ContentItem {
  page: string
  section: string
  key: string
  value: string
  locale?: string
  type?: string
}

export interface DraftRow {
  page: string
  section: string
  key: string
  locale: string
  value: string
  type: string
  updatedAt: number
}

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(',')

/**
 * Upsert content cells like the legacy bulk save: an empty value deletes the
 * cell, and the previous value of every changed cell goes to content_revisions.
 */
export function applyContentItems(sqlite: Sqlite, items: ContentItem[], userId?: number): void {
  const find = sqlite.prepare('SELECT id, value FROM site_content WHERE page = ? AND section = ? AND key = ? AND locale = ?')
  const revise = sqlite.prepare('INSERT INTO content_revisions (page, section, key, locale, value, user_id) VALUES (?, ?, ?, ?, ?, ?)')
  const remove = sqlite.prepare('DELETE FROM site_content WHERE id = ?')
  const update = sqlite.prepare('UPDATE site_content SET value = ?, updated_at = unixepoch() WHERE id = ?')
  const insert = sqlite.prepare('INSERT INTO site_content (page, section, key, value, locale, type) VALUES (?, ?, ?, ?, ?, ?)')

  sqlite.transaction(() => {
    for (const item of items) {
      const locale = item.locale || 'en'
      const existing = find.get(item.page, item.section, item.key, locale) as { id: number, value: string } | undefined
      const previous = existing?.value ?? null
      const next = item.value || null
      if (previous !== next) revise.run(item.page, item.section, item.key, locale, previous, userId ?? null)

      if (!item.value) {
        if (existing) remove.run(existing.id)
        continue
      }
      if (existing) update.run(item.value, existing.id)
      else insert.run(item.page, item.section, item.key, item.value, locale, item.type || 'text')
    }
  })()
}

export function listDrafts(sqlite: Sqlite, pages: string[]): DraftRow[] {
  if (!pages.length) return []
  return sqlite.prepare(
    `SELECT page, section, key, locale, value, type, updated_at AS updatedAt
     FROM content_drafts WHERE page IN (${placeholders(pages.length)}) ORDER BY page, section, key, locale`,
  ).all(...pages) as DraftRow[]
}

/**
 * Replace the drafts of `pages` with exactly `items` (the cells that differ from
 * the published content). Items for other pages are ignored. Returns the count.
 */
export function replaceDrafts(sqlite: Sqlite, pages: string[], items: ContentItem[], userId?: number): number {
  const allowed = new Set(pages)
  const unique = new Map<string, ContentItem>()
  for (const item of items) {
    if (!allowed.has(item.page)) continue
    unique.set(`${item.page}\u0000${item.section}\u0000${item.key}\u0000${item.locale || 'en'}`, item)
  }
  const wipe = sqlite.prepare(`DELETE FROM content_drafts WHERE page IN (${placeholders(pages.length)})`)
  const insert = sqlite.prepare('INSERT INTO content_drafts (page, section, key, locale, value, type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
  sqlite.transaction(() => {
    if (pages.length) wipe.run(...pages)
    for (const item of unique.values()) {
      insert.run(item.page, item.section, item.key, item.locale || 'en', item.value, item.type || 'text', userId ?? null)
    }
  })()
  return unique.size
}

export function discardDrafts(sqlite: Sqlite, pages: string[]): number {
  if (!pages.length) return 0
  return sqlite.prepare(`DELETE FROM content_drafts WHERE page IN (${placeholders(pages.length)})`).run(...pages).changes
}

/** Promote the drafts of `pages` into site_content and drop them. Atomic. */
export function publishDrafts(sqlite: Sqlite, pages: string[], userId?: number): number {
  const drafts = listDrafts(sqlite, pages)
  if (!drafts.length) return 0
  sqlite.transaction(() => {
    applyContentItems(sqlite, drafts, userId)
    discardDrafts(sqlite, pages)
  })()
  return drafts.length
}
