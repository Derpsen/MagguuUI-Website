/**
 * GET /api/v1/admin/news
 */

import { listAllNews } from '~/server/utils/newsStore'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const items = listAllNews()
  return apiSuccess(items, { count: items.length })
})
