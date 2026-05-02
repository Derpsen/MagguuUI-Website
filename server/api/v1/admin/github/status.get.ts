/**
 * GET /api/v1/admin/github/status
 *
 * Returns GitHub connection status, repo info, and recent sync history.
 */

import { desc, count, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { syncHistory, settings } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const hasToken = !!config.githubToken
  const repo = config.githubRepo || 'Derpsen/MagguuUI'

  // Get recent syncs
  const recentSyncs = db.select().from(syncHistory)
    .orderBy(desc(syncHistory.createdAt))
    .limit(20)
    .all()

  // Get sync stats
  const totalSyncs = db.select({ count: count() }).from(syncHistory).get()

  // Get stored version info
  let latestVersion: string | null = null
  let localVersion: string | null = null
  let lastCheck: string | null = null
  try {
    const vRow = db.select().from(settings).where(eq(settings.key, 'github_latest_version')).get()
    latestVersion = vRow?.value || null
    const cRow = db.select().from(settings).where(eq(settings.key, 'github_last_check')).get()
    lastCheck = cRow?.value || null
    // Try 'local_version' first (set by webhook sync), fall back to 'addon_version'
    const lRow = db.select().from(settings).where(eq(settings.key, 'local_version')).get()
      || db.select().from(settings).where(eq(settings.key, 'addon_version')).get()
    localVersion = lRow?.value || null
  } catch { /* ok */ }

  return apiSuccess({
    configured: hasToken,
    repo,
    totalSyncs: totalSyncs?.count || 0,
    latestVersion,
    localVersion,
    lastCheck,
    recentSyncs: recentSyncs.map(s => ({
      id: s.id,
      trigger: s.triggerSource,
      status: s.status,
      details: s.details,
      createdAt: s.createdAt,
    })),
  })
})
