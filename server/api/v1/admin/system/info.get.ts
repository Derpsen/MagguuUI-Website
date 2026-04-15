/**
 * GET /api/v1/admin/system/info
 *
 * Returns system information: DB size, table row counts,
 * app version, Node version, uptime, etc.
 */

import { statSync } from 'fs'
import { join } from 'path'
import { sqlite } from '~/server/database'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const dbPath = join(process.cwd(), 'data', 'magguuui.db')

  // Database file size
  let dbSizeBytes = 0
  try {
    const stat = statSync(dbPath)
    dbSizeBytes = stat.size
    // Also add WAL file size if exists
    try {
      const walStat = statSync(dbPath + '-wal')
      dbSizeBytes += walStat.size
    } catch { /* no WAL file */ }
  } catch { /* file not found */ }

  // Row counts for main tables — use a whitelist to prevent SQL injection
  // via table name interpolation.
  const ALLOWED_TABLES = [
    'profiles', 'wowup_strings', 'character_layouts', 'changelogs',
    'users', 'sessions', 'login_attempts', 'passkeys', 'activity_log',
    'api_keys', 'page_views', 'copy_events',
  ] as const

  const safeTableCount = (table: string): number => {
    if (!(ALLOWED_TABLES as readonly string[]).includes(table)) return 0
    try {
      return (sqlite.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get() as { count: number } | undefined)?.count || 0
    } catch { return 0 }
  }

  const tableCounts = {
    profiles: safeTableCount('profiles'),
    wowupStrings: safeTableCount('wowup_strings'),
    characterLayouts: safeTableCount('character_layouts'),
    changelogs: safeTableCount('changelogs'),
    users: safeTableCount('users'),
    sessions: safeTableCount('sessions'),
    loginAttempts: safeTableCount('login_attempts'),
    passkeys: safeTableCount('passkeys'),
    activityLog: safeTableCount('activity_log'),
    apiKeys: safeTableCount('api_keys'),
    pageViews: safeTableCount('page_views'),
    copyEvents: safeTableCount('copy_events'),
  }

  // App version from runtime config
  const config = useRuntimeConfig()
  const appVersion = config.public.appVersion || '3.0.0'

  // Active sessions count
  const activeSessions = (sqlite.prepare(
    'SELECT COUNT(*) as count FROM sessions WHERE is_revoked = 0 AND expires_at > ?'
  ).get(Math.floor(Date.now() / 1000)) as { count: number } | undefined)?.count || 0

  return apiSuccess({
    database: {
      sizeBytes: dbSizeBytes,
      sizeFormatted: formatBytes(dbSizeBytes),
      tables: tableCounts,
    },
    app: {
      version: appVersion,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
    },
    activeSessions,
  })
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
