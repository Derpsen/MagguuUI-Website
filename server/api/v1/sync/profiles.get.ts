import { readGroupedProfiles } from '~/server/utils/profileReadModels'
import { requireSyncApiBearer } from '~/server/utils/syncApiAuth'

export default defineEventHandler((event) => {
  requireSyncApiBearer(event)
  const result = readGroupedProfiles({ includeHidden: true })
  return apiSuccess(result.data, { count: result.count })
})
