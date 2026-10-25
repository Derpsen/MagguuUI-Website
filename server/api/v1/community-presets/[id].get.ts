/**
 * GET /api/v1/community-presets/:id
 *
 * The string of one APPROVED community preset (404 for pending, rejected or unknown ids).
 */
import { sqlite } from '~/server/database'
import { getPublicPresetString } from '~/server/utils/communityPresets'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 404, message: 'Not found' })
  const found = getPublicPresetString(sqlite, id)
  if (!found) throw createError({ statusCode: 404, message: 'Not found' })
  return apiSuccess(found)
})
