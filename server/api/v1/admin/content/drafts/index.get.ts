/**
 * GET /api/v1/admin/content/drafts?pages=about,imprint
 *
 * Unpublished content edits for the given pages (admin only, never public).
 * { items: [{ page, section, key, locale, value, type, updatedAt }], count, updatedAt }
 */
import { sqlite } from '~/server/database'
import { listDrafts } from '~/server/utils/contentDrafts'
import { parseDraftPages } from '~/server/utils/contentDraftPages'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const pages = parseDraftPages(getQuery(event).pages)
  const items = listDrafts(sqlite, pages)
  const updatedAt = items.reduce((max, i) => Math.max(max, i.updatedAt), 0) || null
  return apiSuccess({ items, count: items.length, updatedAt })
})
