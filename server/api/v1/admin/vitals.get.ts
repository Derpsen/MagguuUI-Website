/** GET /api/v1/admin/vitals?days=28 — p75 per page and metric (anonymous RUM). */

import { gte } from 'drizzle-orm'
import { db } from '~/server/database'
import { webVitals } from '~/server/database/schema'
import { aggregateVitals } from '~/server/utils/webVitals'

export default defineEventHandler((event) => {
  requireAuth(event)
  const days = Math.min(90, Math.max(1, Number(getQuery(event).days) || 28))
  const since = new Date(Date.now() - days * 86_400_000)
  const rows = db.select({ path: webVitals.path, metric: webVitals.metric, value: webVitals.value })
    .from(webVitals).where(gte(webVitals.createdAt, since)).all()
  return apiSuccess({ days, total: rows.length, rows: aggregateVitals(rows) })
})
