/**
 * SQLite-backed storage for password-login backoff (rate_limits table, keys
 * `login-fail:ip:<ipKey>` / `login-fail:user:<username>`). Columns are reused
 * as count = failures, first_attempt = last failure time, blocked_until.
 * Rows are pruned by cleanupRateLimits() like every other rate-limit row.
 */
import { sqlite } from '~/server/database'
import {
  nextFailureState,
  retryAfterSeconds,
  type BackoffConfig,
  type BackoffState,
} from '~/server/utils/loginBackoff'

const getStmt = sqlite.prepare('SELECT count, first_attempt, blocked_until FROM rate_limits WHERE key = ?')
const upsertStmt = sqlite.prepare(
  'INSERT INTO rate_limits (key, count, first_attempt, blocked_until, updated_at) VALUES (?, ?, ?, ?, ?) ' +
  'ON CONFLICT(key) DO UPDATE SET count = excluded.count, first_attempt = excluded.first_attempt, ' +
  'blocked_until = excluded.blocked_until, updated_at = excluded.updated_at',
)
const deleteStmt = sqlite.prepare('DELETE FROM rate_limits WHERE key = ?')

function readState(key: string): BackoffState | undefined {
  const row = getStmt.get(key) as { count: number; first_attempt: number; blocked_until: number } | undefined
  return row ? { failures: row.count, lastFailureAt: row.first_attempt, blockedUntil: row.blocked_until } : undefined
}

export function loginThrottleRetryAfter(key: string, now = Date.now()): number {
  return retryAfterSeconds(readState(key), now)
}

export function recordLoginFailure(key: string, cfg: BackoffConfig, now = Date.now()): BackoffState {
  const tx = sqlite.transaction(() => {
    const next = nextFailureState(readState(key), now, cfg)
    upsertStmt.run(key, next.failures, next.lastFailureAt, next.blockedUntil, now)
    return next
  })
  return tx()
}

export function clearLoginFailures(key: string) {
  deleteStmt.run(key)
}
