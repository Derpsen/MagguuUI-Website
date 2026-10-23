/**
 * Pure exponential-backoff math for password-login throttling (no DB, unit
 * tested). Storage lives in server/utils/loginThrottle.ts.
 *
 * The first `freeFailures` failures cost nothing. Failure n > freeFailures
 * blocks for baseMs * 2^(n - freeFailures - 1), capped at maxMs. A quiet
 * period of resetAfterMs since the last failure starts the count over.
 */
export interface BackoffConfig {
  freeFailures: number
  baseMs: number
  maxMs: number
  resetAfterMs: number
}

export interface BackoffState {
  failures: number
  blockedUntil: number
  lastFailureAt: number
}

export function backoffDelayMs(failures: number, cfg: BackoffConfig): number {
  if (failures <= cfg.freeFailures) return 0
  const exp = Math.min(failures - cfg.freeFailures - 1, 30)
  return Math.min(cfg.baseMs * 2 ** exp, cfg.maxMs)
}

export function nextFailureState(prev: BackoffState | undefined, now: number, cfg: BackoffConfig): BackoffState {
  const failures = prev && now - prev.lastFailureAt <= cfg.resetAfterMs ? prev.failures + 1 : 1
  const delay = backoffDelayMs(failures, cfg)
  return { failures, blockedUntil: delay > 0 ? now + delay : 0, lastFailureAt: now }
}

/** Seconds until the caller may try again (0 = allowed now). */
export function retryAfterSeconds(state: BackoffState | undefined, now: number): number {
  if (!state || state.blockedUntil <= now) return 0
  return Math.ceil((state.blockedUntil - now) / 1000)
}

// Per IP (/64 for IPv6): 5 free failures, then 30 s doubling up to 15 min.
export const LOGIN_IP_BACKOFF: BackoffConfig = {
  freeFailures: 5,
  baseMs: 30_000,
  maxMs: 15 * 60_000,
  resetAfterMs: 60 * 60_000,
}

// Per account (all IPs): 10 free failures, then 30 s doubling up to 15 min.
// Only slows password guessing; it never locks the account or touches
// existing sessions, and passkey login is not affected.
export const LOGIN_ACCOUNT_BACKOFF: BackoffConfig = {
  freeFailures: 10,
  baseMs: 30_000,
  maxMs: 15 * 60_000,
  resetAfterMs: 60 * 60_000,
}
