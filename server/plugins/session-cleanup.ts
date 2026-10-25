/**
 * Session & WebAuthn Cleanup Plugin
 *
 * Periodically removes expired/revoked sessions, old login attempts,
 * and expired WebAuthn challenges.
 * Runs every 30 minutes + once on startup.
 */

import { cleanupExpiredSessions, cleanupOldLoginAttempts } from '~/server/utils/session'
import { cleanupExpiredChallenges } from '~/server/utils/webauthn'
import { getDataRetentionDays } from '~/server/utils/settings'
import { sqlite } from '~/server/database'
import { cleanupRateLimits } from '~/server/utils/rateLimit'
import { runAnalyticsMaintenance } from '~/server/utils/analytics'

function runCleanup() {
  const retentionDays = getDataRetentionDays()
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60

  cleanupExpiredSessions()
  cleanupOldLoginAttempts(retentionDays)
  cleanupExpiredChallenges()
  cleanupRateLimits()

  // Clean up old page views & copy events based on data retention setting
  try {
    // Anonymous counting: roll up finished days, scrub legacy identifiers, prune detail rows
    // (RAW_DETAIL_DAYS) and old aggregates. Independent of the retention setting.
    runAnalyticsMaintenance(sqlite)
    sqlite.prepare('DELETE FROM web_vitals WHERE created_at < ?').run(cutoff)
    // Keep the newest 50 revisions per content cell; older ones go.
    sqlite.prepare(`DELETE FROM content_revisions WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY page, section, key, locale ORDER BY id DESC) AS rn
        FROM content_revisions
      ) WHERE rn > 50
    )`).run()
  } catch { /* tables may not exist yet */ }
}

export default defineNitroPlugin(() => {
  // Run cleanup every 30 minutes
  const cleanupInterval = setInterval(() => {
    try {
      runCleanup()
    } catch (e) {
      console.error('[Cleanup] Error:', e)
    }
  }, 30 * 60 * 1000)
  cleanupInterval.unref?.()

  // Run once on startup (after 5s delay to let DB initialize)
  const startupTimer = setTimeout(() => {
    try {
      runCleanup()
      console.log('[Cleanup] ✓ Initial cleanup complete')
    } catch (e) {
      console.error('[Cleanup] Initial cleanup error:', e)
    }
  }, 5000)
  startupTimer.unref?.()
})
