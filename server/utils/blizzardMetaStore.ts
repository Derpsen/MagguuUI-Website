import type Database from 'better-sqlite3'
/**
 * SQLite cache for Meta snapshots. Rows are addressed by snapshot_id. An
 * active pointer per region is switched only after a complete write, so
 * readers never see a half snapshot. Expired rows (≤ 30 days) are deleted
 * after the pointer is cleared or moved; a tombstone remains so pages can
 * show "Data unavailable" instead of "Collecting data".
 */

import { parseMetaSnapshotPayload } from '~/utils/metaSnapshot'
import { META_REGION, META_SNAPSHOT_TTL_MS, type MetaSnapshotPayload } from '~/utils/metaTypes'

export type MetaSqlite = Database.Database

export type StoredMetaSnapshot = {
  snapshotId: number
  region: string
  season: string | null
  period: string | null
  fetchedAt: number
  expiresAt: number
  status: 'ok' | 'staging' | 'expired'
  payload: MetaSnapshotPayload
  source: string
}

export type MetaSnapshotState =
  | { status: 'ok', snapshot: StoredMetaSnapshot }
  | { status: 'empty' }
  | { status: 'unavailable' }

type SnapshotRow = {
  snapshot_id: number
  region: string
  season: string | null
  period: string | null
  fetched_at: number
  expires_at: number
  status: string
  payload: string
  source: string
}

function asStored(row: SnapshotRow, payload: MetaSnapshotPayload): StoredMetaSnapshot {
  const status = row.status === 'staging' || row.status === 'expired' ? row.status : 'ok'
  return {
    snapshotId: row.snapshot_id,
    region: row.region,
    season: row.season,
    period: row.period,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    status,
    payload,
    source: row.source,
  }
}

function rowById(sqlite: MetaSqlite, snapshotId: number): SnapshotRow | undefined {
  return sqlite.prepare(`
    SELECT snapshot_id, region, season, period, fetched_at, expires_at, status, payload, source
    FROM meta_snapshots
    WHERE snapshot_id = ?
    LIMIT 1
  `).get(snapshotId) as SnapshotRow | undefined
}

function insertSnapshotRow(
  sqlite: MetaSqlite,
  payload: MetaSnapshotPayload,
  now: number,
  ttlMs: number,
  status: 'ok' | 'staging',
): number {
  const fetchedAt = Math.floor(now / 1000)
  const expiresAt = Math.floor((now + ttlMs) / 1000)
  const season = payload.season ? String(payload.season.id) : null
  const period = payload.periods ? String(payload.periods.current.id) : null
  const parsed = parseMetaSnapshotPayload(payload)
  if (!parsed) throw new Error('Meta snapshot payload failed validation')
  const inserted = sqlite.prepare(`
    INSERT INTO meta_snapshots (region, season, period, fetched_at, expires_at, status, payload, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'blizzard')
  `).run(parsed.region, season, period, fetchedAt, expiresAt, status, JSON.stringify(parsed)) as { lastInsertRowid: number }
  return Number(inserted.lastInsertRowid)
}

function setActivePointer(sqlite: MetaSqlite, region: string, snapshotId: number) {
  sqlite.prepare(`
    INSERT INTO meta_snapshot_active (region, snapshot_id)
    VALUES (?, ?)
    ON CONFLICT(region) DO UPDATE SET snapshot_id = excluded.snapshot_id
  `).run(region, snapshotId)
}

/**
 * Drop expired snapshots without leaving the active pointer hanging on a
 * deleted row (foreign_keys=ON). The latest expired active row is kept as a
 * payload-less tombstone so the page can show "Data unavailable".
 */
export function deleteExpiredMetaSnapshots(sqlite: MetaSqlite, now = Date.now()): number {
  const nowSec = Math.floor(now / 1000)
  let removed = 0
  const run = sqlite.transaction(() => {
    const expiredActive = sqlite.prepare(`
      SELECT a.region, a.snapshot_id
      FROM meta_snapshot_active a
      JOIN meta_snapshots s ON s.snapshot_id = a.snapshot_id
      WHERE s.expires_at <= ?
    `).all(nowSec) as Array<{ region: string, snapshot_id: number }>
    for (const row of expiredActive) {
      sqlite.prepare(`
        UPDATE meta_snapshots
        SET status = 'expired', payload = '{}'
        WHERE snapshot_id = ?
      `).run(row.snapshot_id)
    }
    const dangling = sqlite.prepare(`
      SELECT region FROM meta_snapshot_active
      WHERE snapshot_id NOT IN (SELECT snapshot_id FROM meta_snapshots)
    `).all() as Array<{ region: string }>
    for (const row of dangling) {
      sqlite.prepare('DELETE FROM meta_snapshot_active WHERE region = ?').run(row.region)
    }
    const result = sqlite.prepare(`
      DELETE FROM meta_snapshots
      WHERE expires_at <= ?
        AND snapshot_id NOT IN (SELECT snapshot_id FROM meta_snapshot_active)
    `).run(nowSec) as { changes?: number }
    removed = result.changes ?? 0
  })
  run()
  return removed
}

export function readCurrentMetaSnapshot(
  sqlite: MetaSqlite,
  region = META_REGION,
  now = Date.now(),
): StoredMetaSnapshot | null {
  const state = readMetaSnapshotState(sqlite, region, now)
  return state.status === 'ok' ? state.snapshot : null
}

/** Distinguish a missing first snapshot from an expired or unreadable one. */
export function readMetaSnapshotState(
  sqlite: MetaSqlite,
  region = META_REGION,
  now = Date.now(),
): MetaSnapshotState {
  const nowSec = Math.floor(now / 1000)
  const active = sqlite.prepare(`
    SELECT s.snapshot_id, s.region, s.season, s.period, s.fetched_at, s.expires_at, s.status, s.payload, s.source
    FROM meta_snapshot_active a
    JOIN meta_snapshots s ON s.snapshot_id = a.snapshot_id
    WHERE a.region = ?
    LIMIT 1
  `).get(region) as SnapshotRow | undefined
  if (active) {
    if (active.status === 'ok' && active.expires_at > nowSec) {
      const payload = parseMetaSnapshotPayload(active.payload)
      if (payload) return { status: 'ok', snapshot: asStored(active, payload) }
      return { status: 'unavailable' }
    }
    return { status: 'unavailable' }
  }
  const any = sqlite.prepare(`
    SELECT 1 FROM meta_snapshots WHERE region = ? LIMIT 1
  `).get(region)
  return any ? { status: 'unavailable' } : { status: 'empty' }
}

/** Write a staging row without touching the active pointer (for atomic promote tests). */
export function writeStagedMetaSnapshot(
  sqlite: MetaSqlite,
  payload: MetaSnapshotPayload,
  now = Date.now(),
  ttlMs = META_SNAPSHOT_TTL_MS,
): { snapshotId: number, region: string } {
  const id = insertSnapshotRow(sqlite, payload, now, ttlMs, 'staging')
  const row = rowById(sqlite, id)
  if (!row) throw new Error('Meta snapshot was staged but could not be read back')
  return { snapshotId: id, region: row.region }
}

/**
 * Switch the active pointer to a staged (or already ok) snapshot in one
 * transaction. A crash before this runs leaves the previous pointer in place.
 */
export function promoteMetaSnapshot(
  sqlite: MetaSqlite,
  snapshotId: number,
  region = META_REGION,
  now = Date.now(),
): StoredMetaSnapshot {
  const run = sqlite.transaction(() => {
    const row = rowById(sqlite, snapshotId)
    if (!row || row.region !== region) throw new Error('Meta snapshot cannot be promoted')
    if (row.expires_at <= Math.floor(now / 1000)) throw new Error('Meta snapshot cannot be promoted')
    const payload = parseMetaSnapshotPayload(row.payload)
    if (!payload) throw new Error('Meta snapshot cannot be promoted')
    sqlite.prepare(`UPDATE meta_snapshots SET status = 'ok' WHERE snapshot_id = ?`).run(snapshotId)
    setActivePointer(sqlite, region, snapshotId)
  })
  run()
  const current = readCurrentMetaSnapshot(sqlite, region, now)
  if (!current || current.snapshotId !== snapshotId) throw new Error('Meta snapshot was promoted but could not be read back')
  return current
}

/**
 * Write a complete snapshot and switch the active pointer in one transaction.
 * Sanity gates that may refuse to promote belong in the nightly job (later PR).
 */
export function writeMetaSnapshot(
  sqlite: MetaSqlite,
  payload: MetaSnapshotPayload,
  now = Date.now(),
  ttlMs = META_SNAPSHOT_TTL_MS,
): StoredMetaSnapshot {
  const parsed = parseMetaSnapshotPayload(payload)
  if (!parsed) throw new Error('Meta snapshot payload failed validation')
  const run = sqlite.transaction(() => {
    const id = insertSnapshotRow(sqlite, parsed, now, ttlMs, 'ok')
    setActivePointer(sqlite, parsed.region, id)
    return id
  })
  const id = run()
  const stored = readCurrentMetaSnapshot(sqlite, parsed.region, now)
  if (!stored || stored.snapshotId !== id) throw new Error('Meta snapshot was written but could not be read back')
  return stored
}
