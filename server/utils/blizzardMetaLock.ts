/**
 * In-process lock so the nightly Meta job cannot overlap itself.
 * A stuck hold expires after TTL.
 */

const TTL_MS = 45 * 60 * 1000
let heldUntil = 0

export const BLIZZARD_META_LOCK_TTL_MS = TTL_MS

export function tryAcquireBlizzardMetaLock(now = Date.now()): boolean {
  if (heldUntil > now) return false
  heldUntil = now + TTL_MS
  return true
}

export function releaseBlizzardMetaLock() {
  heldUntil = 0
}

export function isBlizzardMetaLockHeld(now = Date.now()): boolean {
  return heldUntil > now
}

export function resetBlizzardMetaLock() {
  heldUntil = 0
}

export async function withBlizzardMetaLock<T>(
  fn: () => Promise<T>,
  now = Date.now(),
): Promise<{ ok: true, value: T } | { ok: false, reason: 'locked' }> {
  if (!tryAcquireBlizzardMetaLock(now)) return { ok: false, reason: 'locked' }
  try {
    return { ok: true, value: await fn() }
  } finally {
    releaseBlizzardMetaLock()
  }
}
