import { readWowUpMap } from '~/server/utils/profileReadModels'
import { requireSyncApiBearer } from '~/server/utils/syncApiAuth'

export default defineEventHandler((event) => {
  requireSyncApiBearer(event)
  const result = readWowUpMap({ includeHidden: true })
  return apiSuccess(result.data, { count: result.count })
})
