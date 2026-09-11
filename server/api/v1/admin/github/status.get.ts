/**
 * GET /api/v1/admin/github/status
 *
 * Returns GitHub connection status, repo info, and recent sync history.
 */

import { desc, count, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { syncHistory, settings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const hasToken = !!config.githubToken
  const repo = config.githubRepo || 'Derpsen/MagguuUI'
  const query = getQuery(event)
  const syncPage = Math.max(1, Number(query.syncPage) || 1)
  const syncLimit = Math.min(50, Math.max(1, Number(query.syncLimit) || 10))
  const syncOffset = (syncPage - 1) * syncLimit

  const totalSyncs = db.select({ count: count() }).from(syncHistory).get()
  const total = totalSyncs?.count || 0
  const recentSyncs = db.select().from(syncHistory)
    .orderBy(desc(syncHistory.createdAt))
    .limit(syncLimit)
    .offset(syncOffset)
    .all()

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
    totalSyncs: total,
    latestVersion,
    localVersion,
    lastCheck,
    syncPage,
    syncLimit,
    syncTotalPages: Math.max(1, Math.ceil(total / syncLimit)),
    recentSyncs: recentSyncs.map(s => ({
      id: s.id,
      trigger: s.triggerSource,
      status: s.status,
      details: s.details,
      createdAt: s.createdAt,
    })),
  })
})
