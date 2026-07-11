/** Public visible WowUp import strings keyed by package name. */

import { readWowUpMap } from '~/server/utils/profileReadModels'

export default defineEventHandler(() => {
  const result = readWowUpMap()
  return apiSuccess(result.data, { count: result.count })
})
