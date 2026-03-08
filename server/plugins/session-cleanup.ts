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

function runCleanup() {
  const retentionDays = getDataRetentionDays()
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60

  cleanupExpiredSessions()
  cleanupOldLoginAttempts(retentionDays)
  cleanupExpiredChallenges()

  // Clean up old page views & copy events based on data retention setting
  try {
    sqlite.prepare('DELETE FROM page_views WHERE created_at < ?').run(cutoff)
    sqlite.prepare('DELETE FROM copy_events WHERE created_at < ?').run(cutoff)
  } catch { /* tables may not exist yet */ }
}

export default defineNitroPlugin(() => {
  // Run cleanup every 30 minutes
  setInterval(() => {
    try {
      runCleanup()
    } catch (e) {
      console.error('[Cleanup] Error:', e)
    }
  }, 30 * 60 * 1000)

  // Run once on startup (after 5s delay to let DB initialize)
  setTimeout(() => {
    try {
      runCleanup()
      console.log('[Cleanup] ✓ Initial cleanup complete')
    } catch (e) {
      console.error('[Cleanup] Initial cleanup error:', e)
    }
  }, 5000)
})
