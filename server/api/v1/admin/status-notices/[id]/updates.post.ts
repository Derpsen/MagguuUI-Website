/**
 * POST /api/v1/admin/status-notices/:id/updates
 *
 * Append one timeline entry (append-only), optionally moving the notice to a new
 * status. Resolving a notice is `{ "status": "resolved" }` plus optional text.
 */

import { sqlite } from '~/server/database'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { NoticeError, appendStatusNoticeUpdate, noticeEntrySchema, noticeSnapshot } from '~/server/utils/statusNoticeStore'
import { validateBody } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid ID' })
  const data = validateBody(noticeEntrySchema, await readBody(event))

  let result
  try {
    result = appendStatusNoticeUpdate(sqlite, id, data, auth.userId)
  } catch (e) {
    if (e instanceof NoticeError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'status_notice', entityId: id, entityName: result.after.title.substring(0, 60), before: noticeSnapshot(result.before), after: noticeSnapshot(result.after), userId: auth.userId })
  clearPublicStatusCache()

  setResponseStatus(event, 201)
  return apiSuccess(result.after)
})
