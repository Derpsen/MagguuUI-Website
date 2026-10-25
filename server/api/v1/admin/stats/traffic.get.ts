/**
 * GET /api/v1/admin/stats/traffic?days=7|30|90
 * Per-route views, top copied items and daily totals from the anonymous counters
 * (site data only). Visitors are summed daily uniques (hashes rotate daily).
 */

import { sqlite } from '~/server/database'
import { REPORT_RANGES } from '~/server/utils/analytics'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const requested = Number(getQuery(event).days)
  const days = (REPORT_RANGES as readonly number[]).includes(requested) ? requested : 7
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return apiSuccess({ ...trafficReport(sqlite, days), ranges: REPORT_RANGES })
})
