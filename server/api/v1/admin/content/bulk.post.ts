/**
 * POST /api/v1/admin/content/bulk
 *
 * Bulk upsert site content. Receives { items: [{ page, section, key, value, locale? }] }
 * Default locale is 'en'.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '~/server/database'
import { siteContent } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, message: 'items array required' })
  }

  for (const item of body.items) {
    if (!item.page || !item.section || !item.key) continue
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

  return { success: true, data: { updated: body.items.length } }
})
