/** GET /api/v1/admin/system/build — what is live: image commit SHA + build time. */

import { readBuildInfo } from '~/utils/buildInfo'

export default defineEventHandler((event) => {
  requireAuth(event)
  return apiSuccess(readBuildInfo())
})
