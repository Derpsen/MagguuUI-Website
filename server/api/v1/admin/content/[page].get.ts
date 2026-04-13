/**
 * GET /api/v1/admin/content/:page
 *
 * Returns all content entries for a page, grouped by locale → section → key: value.
 * { de: { hero: { title: "..." } }, en: { hero: { title: "..." } } }
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { siteContent } from '~/server/database/schema'
import { createContentLocaleBuckets, DEFAULT_CONTENT_LOCALE } from '~/server/utils/contentLocales'

export default defineEventHandler(async (event) => {
  const page = getRouterParam(event, 'page')
  if (!page) throw createError({ statusCode: 400, message: 'Page parameter required' })

  const entries = db.select().from(siteContent).where(eq(siteContent.page, page)).all()

  // Group by locale → section → key: value
  const result: Record<string, Record<string, Record<string, string>>> = createContentLocaleBuckets(() => ({}))
  for (const e of entries) {
    const locale = e.locale || DEFAULT_CONTENT_LOCALE
    if (!result[locale]) result[locale] = {}
    if (!result[locale][e.section]) result[locale][e.section] = {}
    result[locale][e.section][e.key] = e.value
  }

  return apiSuccess(result)
})
