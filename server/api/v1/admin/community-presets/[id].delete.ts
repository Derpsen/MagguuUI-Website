/**
 * DELETE /api/v1/admin/community-presets/:id: removes a submission for good.
 */
import { sqlite } from '~/server/database'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { PresetError, deletePreset, presetSnapshot } from '~/server/utils/communityPresets'

export default defineEventHandler((event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid ID' })

  let before
  try {
    before = deletePreset(sqlite, id)
  } catch (e) {
    if (e instanceof PresetError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }

  recordAuditSafe(sqlite, { action: 'deleted', entityType: 'community_preset', entityId: id, entityName: before.name.substring(0, 60), before: presetSnapshot(before), after: null, userId: auth.userId })
  return apiSuccess({ id })
})
