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

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    }
  } catch {
    throw createError({ statusCode: 503, message: 'Database unavailable' })
  }
})
