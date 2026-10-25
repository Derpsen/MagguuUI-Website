/**
 * Sign-in protection data (pure: a `sqlite` handle and relative imports only, unit tested in memory).
 *
 * login_attempts keeps the network address and the user-agent text of a sign-in attempt for LOGIN_ATTEMPT_IDENTIFIER_HOURS
 * only (Privacy section 9 promises "up to 24 hours"; the cleanup runs every 30 minutes, so the limit is 23 hours). After
 * that the two columns are set to NULL; the row itself (username, parsed browser/OS, outcome, flag) stays until the
 * data-retention period of the admin settings. Nothing here changes who can sign in: the per-address and per-account
 * throttles are rows of the SQLite rate_limits table (loginThrottle.ts, keys `login-fail:ip:` / `login-fail:user:`, thresholds in
 * loginBackoff.ts) and the explicit account lock is on the users table.
 */
import type Database from 'better-sqlite3'

type Sqlite = Pick<Database.Database, 'prepare'>

export const LOGIN_ATTEMPT_IDENTIFIER_HOURS = 23

/** Sets ip_address and user_agent to NULL on attempts older than the limit. Returns the number of rows scrubbed. */
export function scrubLoginAttemptIdentifiers(sqlite: Sqlite, now = Math.floor(Date.now() / 1000), hours = LOGIN_ATTEMPT_IDENTIFIER_HOURS): number {
  const cutoff = now - hours * 3600
  return sqlite.prepare(
    'UPDATE login_attempts SET ip_address = NULL, user_agent = NULL WHERE created_at < ? AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)',
  ).run(cutoff).changes
}

export interface LoginFlagInput { username: string, ip: string, browser: string, os: string }

/**
 * Informational flag on an attempt (it blocks nothing):
 *  - brute_force: 3+ failures from this address in the last 30 minutes.
 *  - new_ip: this account signed in successfully within the retained window, but never from this address. With no
 *    successful sign-in in the window (addresses are gone after 23 hours) there is nothing to compare against, so the
 *    check does not flag; the device check below still applies.
 *  - new_device: this account never signed in from this browser + OS combination (kept for the whole retention period).
 */
export function detectSuspiciousLogin(sqlite: Sqlite, opts: LoginFlagInput, now = Math.floor(Date.now() / 1000)): { flagged: boolean, reason: string | null } {
  const recentFails = sqlite.prepare(
    'SELECT COUNT(*) AS count FROM login_attempts WHERE ip_address = ? AND success = 0 AND created_at > ?',
  ).get(opts.ip, now - 30 * 60) as { count: number }
  if (recentFails.count >= 3) return { flagged: true, reason: 'brute_force' }

  const known = sqlite.prepare(
    'SELECT COUNT(*) AS total, SUM(CASE WHEN ip_address = ? THEN 1 ELSE 0 END) AS same FROM login_attempts WHERE username = ? AND success = 1 AND ip_address IS NOT NULL',
  ).get(opts.ip, opts.username) as { total: number, same: number | null }
  if (known.total > 0 && !known.same) return { flagged: true, reason: 'new_ip' }

  const knownDevice = sqlite.prepare(
    'SELECT COUNT(*) AS count FROM login_attempts WHERE username = ? AND browser = ? AND os = ? AND success = 1',
  ).get(opts.username, opts.browser, opts.os) as { count: number }
  if (knownDevice.count === 0) return { flagged: true, reason: 'new_device' }

  return { flagged: false, reason: null }
}
