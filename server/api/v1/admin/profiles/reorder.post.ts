/**
 * POST /api/v1/admin/profiles/reorder
 * Bulk update sort order from drag & drop.
 * Body: { items: [{ id: number, sortOrder: number }] }
 */

import { profiles } from '~/server/database/schema'
import { reorderBySortOrder } from '~/server/utils/adminCrud'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  reorderBySortOrder(profiles, data.items)
  triggerGitHubSync('profiles-reordered').catch(() => {})
  return apiSuccess({ updated: data.items.length })
})
