/**
 * DELETE /api/v1/admin/content/drafts?pages=about,imprint
 *
 * Discard the unpublished edits of the given pages. Published content is untouched.
 */
import { sqlite } from '~/server/database'
import { discardDrafts } from '~/server/utils/contentDrafts'
import { parseDraftPages } from '~/server/utils/contentDraftPages'

export default defineEventHandler((event) => {
  const auth = requireAdminAccess(event)
  const pages = parseDraftPages(getQuery(event).pages)
  const discarded = discardDrafts(sqlite, pages)
  if (discarded) {
    logActivity({
      action: 'deleted',
      entityType: 'content',
      entityName: `${pages.join(', ')} draft`,
      details: { discarded, pages },
      userId: auth.userId,
    })
  }
  return apiSuccess({ discarded })
})
