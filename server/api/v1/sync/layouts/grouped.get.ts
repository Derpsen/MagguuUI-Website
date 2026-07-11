import { readGroupedLayouts } from '~/server/utils/profileReadModels'
import { requireSyncApiBearer } from '~/server/utils/syncApiAuth'

export default defineEventHandler((event) => {
  requireSyncApiBearer(event)
  const result = readGroupedLayouts({ includeHidden: true, requireUnique: true })
  return apiSuccess(result.data, { count: result.count, classes: result.classes })
})
