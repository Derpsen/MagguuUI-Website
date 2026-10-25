/**
 * GET /api/v1/admin/status-notices
 *
 * Every notice (newest first) with its timeline, for the admin page.
 */

import { sqlite } from '~/server/database'
import { listAdminStatusNotices } from '~/server/utils/statusNoticeStore'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  return apiSuccess(listAdminStatusNotices(sqlite))
})
