/**
 * POST /api/v1/admin/content/revisions/:id/restore
 * Puts a revision's value back (NULL deletes the cell, so the page shows its
 * default). The value being replaced becomes a new revision, so a restore can
 * itself be undone. Admin write → public caches clear (public-cache plugin).
 */

import { and, eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { contentRevisions, siteContent } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'
import { isHtmlCopyKey } from '~/utils/pageCopyDefaults'

export default defineEventHandler((event) => {
  const auth = requireAuth(event)
  const id = parseRouteId(event)
  const rev = db.select().from(contentRevisions).where(eq(contentRevisions.id, id)).get()
  if (!rev) throw createError({ statusCode: 404, message: 'Revision not found' })

  sqlite.transaction(() => {
    const where = and(
      eq(siteContent.page, rev.page),
      eq(siteContent.section, rev.section),
      eq(siteContent.key, rev.key),
      eq(siteContent.locale, rev.locale),
    )
    const existing = db.select().from(siteContent).where(where).get()
    db.insert(contentRevisions).values({
      page: rev.page, section: rev.section, key: rev.key, locale: rev.locale,
      value: existing?.value ?? null, userId: auth.userId,
    }).run()
    if (rev.value === null) {
      if (existing) db.delete(siteContent).where(eq(siteContent.id, existing.id)).run()
    } else if (existing) {
      db.update(siteContent).set({ value: rev.value, updatedAt: new Date() }).where(eq(siteContent.id, existing.id)).run()
    } else {
      db.insert(siteContent).values({
        page: rev.page, section: rev.section, key: rev.key, locale: rev.locale, value: rev.value,
        type: isHtmlCopyKey(rev.key) ? 'html' : 'text',
      }).run()
    }
  })()

  logActivity({
    action: 'updated',
    entityType: 'content',
    entityName: `${rev.page} restore`,
    details: { revisionId: rev.id, section: rev.section, key: rev.key },
    userId: auth.userId,
  })
  return apiSuccess({ restored: rev.id })
})
