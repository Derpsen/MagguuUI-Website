/**
 * POST /api/v1/admin/wowup/reorder
 */

import { wowupStrings } from '~/server/database/schema'
import { reorderBySortOrder } from '~/server/utils/adminCrud'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  reorderBySortOrder(wowupStrings, data.items)
  triggerGitHubSync('wowup-reordered').catch(() => {})
  return apiSuccess({ updated: data.items.length })
})
