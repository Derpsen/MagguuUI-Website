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
import { retentionSteps, runRetentionCleanup, walCheckpointStep } from '~/server/utils/retentionCleanup'

function runCleanup() {
  const retentionDays = getDataRetentionDays()
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60

  // Personal-data retention FIRST (visitor log 13 months, sign-in identifiers 23 hours, vitals), then the housekeeping,
  // then one WAL checkpoint. Every step is isolated and a failure is logged (never swallowed), so a broken housekeeping
  // step can never keep the retention from running.
  const failed = runRetentionCleanup(sqlite, cutoff, undefined, [
    ...retentionSteps(sqlite, cutoff),
    { name: 'expired sessions', run: () => cleanupExpiredSessions() },
    { name: 'old login attempts', run: () => cleanupOldLoginAttempts(retentionDays) },
    { name: 'webauthn challenges', run: () => cleanupExpiredChallenges() },
    { name: 'rate limits', run: () => cleanupRateLimits() },
    walCheckpointStep(sqlite),
  ])
  if (failed.length) throw new Error(`retention steps failed: ${failed.join(', ')}`)
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
