/**
 * In-process lock so the nightly GitHub job and the admin Check / Resync
 * buttons cannot run at the same time. A stuck hold expires after TTL.
 */

const TTL_MS = 120_000
let heldUntil = 0

export const GITHUB_SYNC_LOCK_TTL_MS = TTL_MS

export function tryAcquireGithubSyncLock(now = Date.now()): boolean {
  if (heldUntil > now) return false
  heldUntil = now + TTL_MS
  return true
}

export function releaseGithubSyncLock() {
  heldUntil = 0
}

export function isGithubSyncLockHeld(now = Date.now()): boolean {
  return heldUntil > now
}

export function resetGithubSyncLock() {
  heldUntil = 0
}

export async function withGithubSyncLock<T>(fn: () => Promise<T>, now = Date.now()): Promise<{ ok: true, value: T } | { ok: false, reason: 'locked' }> {
  if (!tryAcquireGithubSyncLock(now)) return { ok: false, reason: 'locked' }
  try {
    return { ok: true, value: await fn() }
  } finally {
    releaseGithubSyncLock()
  }
}
