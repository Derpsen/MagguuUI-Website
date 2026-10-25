/**
 * POST /api/v1/admin/status-notices
 *
 * Create a maintenance / incident notice. Limited Markdown body, validated and
 * length-capped; audited; the public status cache is cleared.
 */

import { sqlite } from '~/server/database'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { NoticeError, createStatusNotice, noticeCreateSchema, noticeSnapshot } from '~/server/utils/statusNoticeStore'
import { validateBody } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const data = validateBody(noticeCreateSchema, await readBody(event))

  let notice
  try {
    notice = createStatusNotice(sqlite, data, auth.userId)
  } catch (e) {
    if (e instanceof NoticeError) throw createError({ statusCode: e.status, message: e.message })
    throw e
  }

  recordAuditSafe(sqlite, { action: 'created', entityType: 'status_notice', entityId: notice.id, entityName: notice.title.substring(0, 60), before: null, after: noticeSnapshot(notice), userId: auth.userId })
  clearPublicStatusCache()

  setResponseStatus(event, 201)
  return apiSuccess(notice)
})
