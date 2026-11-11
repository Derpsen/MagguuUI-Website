/**
 * GET /api/v1/admin/stats/traffic?days=7|30|90
 * Per-route views, top copied items and daily totals from the anonymous counters
 * (site data only). Optional `referrer` (exact host) returns `referrerMatch` from
 * the full map, not the truncated top-10 `referrers` list. Visitors are summed daily uniques (hashes rotate daily).
 */

import { sqlite } from '~/server/database'
import { REPORT_RANGES } from '~/server/utils/analytics'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const query = getQuery(event)
  const requested = Number(query.days)
  const days = (REPORT_RANGES as readonly number[]).includes(requested) ? requested : 7
  const referrer = typeof query.referrer === 'string' ? query.referrer.trim().slice(0, 253) : ''
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return apiSuccess({
    ...trafficReport(sqlite, days, undefined, referrer ? { referrer } : undefined),
    ranges: REPORT_RANGES,
  })
})
