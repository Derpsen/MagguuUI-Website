/**
 * GET /api/health
 *
 * Health check for Docker and monitoring.
 */

import { db } from '~/server/database'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  try {
    // Quick DB check
    db.run(sql`SELECT 1`)

    // Version intentionally omitted: leaking app version to anonymous callers
    // aids reconnaissance for targeted CVE selection. Authenticated admins can
    // still see it via /api/v1/admin/system/info.
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  } catch {
    throw createError({ statusCode: 503, message: 'Database unavailable' })
  }
})
