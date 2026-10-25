/**
 * GET /api/v1/community-presets
 *
 * Approved community presets only (whitelisted fields, no string: that is `/:id`).
 * Not cached by the route cache; an approval shows up at once.
 */
import { sqlite } from '~/server/database'
import { listPublicPresets } from '~/server/utils/communityPresets'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  return apiSuccess(listPublicPresets(sqlite))
})
