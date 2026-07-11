/** Public visible character layouts grouped by class name. */

import { readGroupedLayouts } from '~/server/utils/profileReadModels'

export default defineEventHandler(() => {
  const result = readGroupedLayouts()
  return apiSuccess(result.data, { count: result.count, classes: result.classes })
})
