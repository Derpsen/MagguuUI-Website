/**
 * Cross-process Meta sync lock stored in SQLite, so the nightly task and the
 * manual CLI (a second Node process in the same container) cannot overlap.
 * A stuck hold expires after TTL, but a running job can ask to be held until
 * its deadline so a second run cannot start mid-job.
 */
import { randomUUID } from 'node:crypto'
import { META_SYNC_LOCK_TABLE_SQL } from '../database/metaSyncLockSql'
import type { MetaSqlite } from './blizzardMetaStore'

const TTL_MS = 45 * 60 * 1000
const LOCK_ID = 1

export const BLIZZARD_META_LOCK_TTL_MS = TTL_MS

export type BlizzardMetaLockClock = number | (() => number)

export type BlizzardMetaLockAcquire =
  | { ok: true, ownerToken: string, heldUntil: number }
  | { ok: false }

function at(now: BlizzardMetaLockClock): number {
  return typeof now === 'function' ? now() : now
}

export function ensureMetaSyncLockTable(sqlite: MetaSqlite) {
  sqlite.exec(META_SYNC_LOCK_TABLE_SQL)
}

export function tryAcquireBlizzardMetaLock(
  sqlite: MetaSqlite,
  now: BlizzardMetaLockClock = Date.now(),
  holdUntil = 0,
  ownerToken = randomUUID(),
): BlizzardMetaLockAcquire {
  ensureMetaSyncLockTable(sqlite)
  const t = at(now)
  const heldUntil = Math.max(t + TTL_MS, holdUntil)
  const acquire = sqlite.transaction(() => {
    const result = sqlite.prepare(`
      INSERT INTO meta_sync_lock (id, owner_token, held_until)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_token = excluded.owner_token,
        held_until = excluded.held_until
      WHERE meta_sync_lock.held_until <= ?
    `).run(LOCK_ID, ownerToken, heldUntil, t)
    if (result.changes !== 1) return { ok: false } as const
    return { ok: true, ownerToken, heldUntil } as const
  })
  return acquire.immediate()
}

export function releaseBlizzardMetaLock(sqlite: MetaSqlite, ownerToken: string) {
  ensureMetaSyncLockTable(sqlite)
  sqlite.prepare('DELETE FROM meta_sync_lock WHERE id = ? AND owner_token = ?').run(LOCK_ID, ownerToken)
}

export function isBlizzardMetaLockHeld(sqlite: MetaSqlite, now: BlizzardMetaLockClock = Date.now()): boolean {
  ensureMetaSyncLockTable(sqlite)
  const row = sqlite.prepare('SELECT held_until FROM meta_sync_lock WHERE id = ?').get(LOCK_ID) as { held_until: number } | undefined
  return Boolean(row && row.held_until > at(now))
}

export function resetBlizzardMetaLock(sqlite: MetaSqlite) {
  ensureMetaSyncLockTable(sqlite)
  sqlite.prepare('DELETE FROM meta_sync_lock WHERE id = ?').run(LOCK_ID)
}

export async function withBlizzardMetaLock<T>(
  sqlite: MetaSqlite,
  fn: () => Promise<T>,
  now: BlizzardMetaLockClock = Date.now(),
  holdUntil = 0,
): Promise<{ ok: true, value: T } | { ok: false, reason: 'locked' }> {
  const acquired = tryAcquireBlizzardMetaLock(sqlite, now, holdUntil)
  if (!acquired.ok) return { ok: false, reason: 'locked' }
  try {
    return { ok: true, value: await fn() }
  } finally {
    releaseBlizzardMetaLock(sqlite, acquired.ownerToken)
  }
}
