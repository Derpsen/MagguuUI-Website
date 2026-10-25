/**
 * GET /api/v1/admin/overview[?fresh=1]
 *
 * Dashboard overview from site data only (see server/utils/adminOverview.ts).
 * Admin-only, read-only, cached for a few seconds. Never returns secrets or
 * audit snapshots.
 */

import { statSync } from 'node:fs'
import { sqlite } from '~/server/database'
import { readBuildInfo } from '~/utils/buildInfo'
import { getOverview } from '~/server/utils/adminOverview'
import { visitorLogEnabled } from '../../../../utils/consent'

function dbSize(): number | null {
  try {
    let size = statSync(sqlite.name).size
    try { size += statSync(`${sqlite.name}-wal`).size } catch { /* no WAL file */ }
    return size
  } catch {
    return null
  }
}

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const fresh = getQuery(event).fresh === '1'
  const build = readBuildInfo()
  return apiSuccess(getOverview(sqlite, {
    dbSizeBytes: dbSize(),
    uptimeSeconds: Math.round(process.uptime()),
    visitorLog: visitorLogEnabled(process.env.NUXT_VISITOR_LOG),
    build: { shortSha: build.shortSha, buildTime: build.buildTime },
  }, fresh))
})
