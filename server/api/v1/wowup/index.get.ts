/** Public visible WowUp import strings keyed by package name. `view=meta` drops the blobs. */

import { readWowUpIndex, readWowUpMap } from '~/server/utils/profileReadModels'

export default defineEventHandler((event) => {
  if (getQuery(event).view === 'meta') {
    const result = readWowUpIndex()
    return apiSuccess(result.data, { count: result.count, view: 'meta' })
  }
  const result = readWowUpMap()
  return apiSuccess(result.data, { count: result.count })
})
