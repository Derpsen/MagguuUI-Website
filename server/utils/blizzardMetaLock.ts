/**
 * In-process lock so the nightly Meta job cannot overlap itself.
 * A stuck hold expires after TTL, but a running job can ask to be held
 * until its deadline so a second run cannot start mid-job.
 */

const TTL_MS = 45 * 60 * 1000
let heldUntil = 0

export const BLIZZARD_META_LOCK_TTL_MS = TTL_MS

export type BlizzardMetaLockClock = number | (() => number)

function at(now: BlizzardMetaLockClock): number {
  return typeof now === 'function' ? now() : now
}

export function tryAcquireBlizzardMetaLock(now: BlizzardMetaLockClock = Date.now(), holdUntil = 0): boolean {
  const t = at(now)
  if (heldUntil > t) return false
  heldUntil = Math.max(t + TTL_MS, holdUntil)
  return true
}

export function releaseBlizzardMetaLock() {
  heldUntil = 0
}

export function isBlizzardMetaLockHeld(now: BlizzardMetaLockClock = Date.now()): boolean {
  return heldUntil > at(now)
}

export function resetBlizzardMetaLock() {
  heldUntil = 0
}

export async function withBlizzardMetaLock<T>(
  fn: () => Promise<T>,
  now: BlizzardMetaLockClock = Date.now(),
  holdUntil = 0,
): Promise<{ ok: true, value: T } | { ok: false, reason: 'locked' }> {
  if (!tryAcquireBlizzardMetaLock(now, holdUntil)) return { ok: false, reason: 'locked' }
  try {
    return { ok: true, value: await fn() }
  } finally {
    releaseBlizzardMetaLock()
  }
}
