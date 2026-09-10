/** Homepage catalog counts without import-string payloads. */

import { readCatalogSummary } from '~/server/utils/profileReadModels'

export default defineEventHandler(() => {
  const data = readCatalogSummary()
  return apiSuccess(data, {
    count: data.profileCount + data.layoutCount + data.wowupCount,
  })
})
