/**
 * GET /api/v1/admin/community-presets/:id: one submission including the full string.
 */
import { sqlite } from '~/server/database'
import { PresetError, getAdminPreset } from '~/server/utils/communityPresets'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid ID' })
  try {
    return apiSuccess(getAdminPreset(sqlite, id))
  } catch (e) {
    if (e instanceof PresetError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }
})
