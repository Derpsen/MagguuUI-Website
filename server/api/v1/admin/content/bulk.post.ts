/**
 * POST /api/v1/admin/content/bulk
 *
 * Bulk upsert site content. Receives { items: [{ page, section, key, value, locale? }] }
 * Default locale is 'en'.
 */

import { eq, and } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { siteContent } from '~/server/database/schema'
import { validateBody, contentBulkSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const data = validateBody(contentBulkSchema, body)

  // Wrap all upserts in a single transaction to avoid N separate fsync round-trips.
  sqlite.transaction(() => {
    for (const item of data.items) {
      const locale = item.locale || 'en'

      const existing = db.select().from(siteContent)
        .where(and(
          eq(siteContent.page, item.page),
          eq(siteContent.section, item.section),
          eq(siteContent.key, item.key),
          eq(siteContent.locale, locale),
        )).get()

      // Delete if value is empty (cleanup removed steps etc.)
      if (!item.value && existing) {
        db.delete(siteContent).where(eq(siteContent.id, existing.id)).run()
        continue
      }
      if (!item.value) continue

      if (existing) {
        db.update(siteContent)
          .set({ value: item.value, updatedAt: new Date() })
          .where(eq(siteContent.id, existing.id))
          .run()
      } else {
        db.insert(siteContent).values({
          page: item.page,
          section: item.section,
          key: item.key,
          value: item.value,
          locale,
          type: item.type || 'text',
        }).run()
      }
    }
  })()

  const pages = Array.from(new Set(data.items.map((i) => i.page)))
  logActivity({
    action: 'updated',
    entityType: 'content',
    entityName: pages.join(', ') || 'bulk',
    details: { items: data.items.length, pages },
    userId: auth.userId,
  })

  return apiSuccess({ updated: data.items.length })
})
