/**
 * POST /api/v1/admin/content/publish
 *
 * Promote the drafts of { pages } into the published content. Writes
 * content_revisions (undoable via history) and removes the drafts. As an admin
 * write it also clears the public route cache (public-cache-invalidate plugin).
 */
import { sqlite } from '~/server/database'
import { publishDrafts } from '~/server/utils/contentDrafts'
import { validateBody, contentDraftPagesSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const data = validateBody(contentDraftPagesSchema, await readBody(event))
  const published = publishDrafts(sqlite, data.pages, auth.userId)
  if (published) {
    logActivity({
      action: 'updated',
      entityType: 'content',
      entityName: `${data.pages.join(', ')} published`,
      details: { published, pages: data.pages },
      userId: auth.userId,
    })
  }
  return apiSuccess({ published })
})
