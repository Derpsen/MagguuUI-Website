/**
 * DELETE /api/v1/admin/status-notices/:id
 *
 * Removes a notice together with its timeline. (Resolving keeps it as history;
 * delete is for mistakes.)
 */

import { sqlite } from '~/server/database'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { NoticeError, deleteStatusNotice, noticeSnapshot } from '~/server/utils/statusNoticeStore'

export default defineEventHandler((event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Invalid ID' })

  let before
  try {
    before = deleteStatusNotice(sqlite, id)
  } catch (e) {
    if (e instanceof NoticeError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }

  recordAuditSafe(sqlite, { action: 'deleted', entityType: 'status_notice', entityId: id, entityName: before.title.substring(0, 60), before: noticeSnapshot(before), after: null, userId: auth.userId })
  clearPublicStatusCache()

  return apiSuccess({ id })
})
