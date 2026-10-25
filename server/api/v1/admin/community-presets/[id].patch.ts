/**
 * PATCH /api/v1/admin/community-presets/:id
 *
 * Approve / reject / reopen (`status`) and/or edit the label (name, note, tested version).
 * The preset string itself is never editable: it is either what was submitted or it is gone.
 */
import { sqlite } from '~/server/database'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { PresetError, labelEditSchema, presetSnapshot, updatePreset } from '~/server/utils/communityPresets'
import { validateBody } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid ID' })
  const data = validateBody(labelEditSchema, await readBody(event))

  let result
  try {
    result = updatePreset(sqlite, id, data, auth.userId)
  } catch (e) {
    if (e instanceof PresetError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'community_preset', entityId: id, entityName: result.after.name.substring(0, 60), before: presetSnapshot(result.before), after: presetSnapshot(result.after), userId: auth.userId })
  return apiSuccess(result.after)
})
