/**
 * GET /api/health
 *
 * Health check for Docker, monitoring and the Magguu-Dashboard status page.
 * Public and secret-free: status, DB check, image commit SHA + build time
 * (GIT_SHA/BUILD_TIME, fallback "dev"), process start time and uptime.
 * The app version stays omitted (reconnaissance); admins see it in system/info.
 * Never cached: a status page must see the live process.
 */

import { db } from '~/server/database'
import { sql } from 'drizzle-orm'
import { readBuildInfo } from '~/utils/buildInfo'

const startedAt = new Date(Date.now() - Math.round(process.uptime() * 1000)).toISOString()

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const build = readBuildInfo()
  let dbOk = true
  try {
    db.run(sql`SELECT 1`)
  } catch {
    dbOk = false
  }
  const body = {
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    build: { sha: build.gitSha, shortSha: build.shortSha, time: build.buildTime },
    checks: { database: dbOk ? 'ok' : 'unavailable' },
  }
  if (!dbOk) setResponseStatus(event, 503)
  return body
})
