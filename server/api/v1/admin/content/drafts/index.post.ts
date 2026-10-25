/**
 * POST /api/v1/admin/content/drafts
 *
 * Save the draft of one or more pages: { pages, items } replaces the drafts of
 * those pages with `items` (only cells that differ from the published content).
 * Nothing public changes until POST /api/v1/admin/content/publish.
 */
import { sqlite } from '~/server/database'
import { replaceDrafts } from '~/server/utils/contentDrafts'
import { validateBody, contentDraftSaveSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const data = validateBody(contentDraftSaveSchema, await readBody(event))
  const count = replaceDrafts(sqlite, data.pages, data.items, auth.userId)
  return apiSuccess({ count })
})
