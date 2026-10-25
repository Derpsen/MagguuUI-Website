/**
 * PUT /api/v1/admin/status-notices/:id
 *
 * Edit the fields of a notice (title, text, component, window). Status changes and
 * timeline entries go through POST /:id/updates.
 */

import { sqlite } from '~/server/database'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { NoticeError, noticeEditSchema, noticeSnapshot, updateStatusNotice } from '~/server/utils/statusNoticeStore'
import { validateBody } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid ID' })
  const data = validateBody(noticeEditSchema, await readBody(event))

  let result
  try {
    result = updateStatusNotice(sqlite, id, data)
  } catch (e) {
    if (e instanceof NoticeError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'status_notice', entityId: id, entityName: result.after.title.substring(0, 60), before: noticeSnapshot(result.before), after: noticeSnapshot(result.after), userId: auth.userId })
  clearPublicStatusCache()

  return apiSuccess(result.after)
})
