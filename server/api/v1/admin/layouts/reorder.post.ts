/**
 * POST /api/v1/admin/layouts/reorder
 * Bulk update sort order. Body: { items: [{ id, sortOrder }] }
 */

import { characterLayouts } from '~/server/database/schema'
import { reorderBySortOrder } from '~/server/utils/adminCrud'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  reorderBySortOrder(characterLayouts, data.items)
  triggerGitHubSync('layouts-reordered').catch(() => {})
  return apiSuccess({ updated: data.items.length })
})
