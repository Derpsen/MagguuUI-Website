/**
 * GET /api/health
 *
 * Health check for Docker, monitoring and the Magguu-Dashboard status page.
 * Public and secret-free: status, DB check, image commit SHA + build time
 * (GIT_SHA/BUILD_TIME, fallback "dev"), process start time and uptime.
 * The app version stays omitted (reconnaissance); admins see it in system/info.
 * Never cached: a status page must see the live process.
 */

import { db, sqlite } from '~/server/database'
import { sql } from 'drizzle-orm'
import { readBuildInfo } from '~/utils/buildInfo'
import { metaSnapshotAgeHours, readLastMetaRun, readMetaSnapshotState } from '~/server/utils/blizzardMetaStore'

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
  let meta: { status: 'ok' | 'empty' | 'unavailable', snapshotAgeHours: number | null, lastRunStatus: string | null }
  try {
    const state = readMetaSnapshotState(sqlite)
    const snapshot = state.status === 'ok' ? state.snapshot : null
    const last = readLastMetaRun(sqlite)
    meta = {
      status: state.status,
      snapshotAgeHours: metaSnapshotAgeHours(snapshot),
      lastRunStatus: last?.status ?? null,
    }
  } catch {
    meta = { status: 'unavailable', snapshotAgeHours: null, lastRunStatus: null }
  }
  const body = {
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    build: { sha: build.gitSha, shortSha: build.shortSha, time: build.buildTime },
    checks: { database: dbOk ? 'ok' : 'unavailable' },
    meta,
  }
  if (!dbOk) setResponseStatus(event, 503)
  return body
})
