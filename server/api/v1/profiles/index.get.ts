/** Public visible addon profiles, optionally filtered by addon. */

import { readGroupedProfiles } from '~/server/utils/profileReadModels'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const addon = typeof query.addon === 'string' ? query.addon : undefined
  const result = readGroupedProfiles({ addon })
  return apiSuccess(result.data, { count: result.count, filter: addon || null })
})
