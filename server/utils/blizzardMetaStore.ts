import type Database from 'better-sqlite3'
/**
 * SQLite cache for Meta snapshots. Rows are addressed by snapshot_id. An
 * active pointer per region is switched only after a complete write, so
 * readers never see a half snapshot. Expired rows (≤ 30 days) are deleted;
 * pages then show "Data unavailable". Tests use an in-memory connection.
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
  status: 'ok'
  payload: MetaSnapshotPayload
  source: string
}

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
  return {
    snapshotId: row.snapshot_id,
    region: row.region,
    season: row.season,
    period: row.period,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    status: 'ok',
    payload,
    source: row.source,
  }
}

export function deleteExpiredMetaSnapshots(sqlite: MetaSqlite, now = Date.now()): number {
  const nowSec = Math.floor(now / 1000)
  const result = sqlite.prepare('DELETE FROM meta_snapshots WHERE expires_at <= ?').run(nowSec) as { changes?: number }
  sqlite.prepare(`
    DELETE FROM meta_snapshot_active
    WHERE snapshot_id NOT IN (SELECT snapshot_id FROM meta_snapshots)
  `).run()
  return result.changes ?? 0
}

export function readCurrentMetaSnapshot(
  sqlite: MetaSqlite,
  region = META_REGION,
  now = Date.now(),
): StoredMetaSnapshot | null {
  const nowSec = Math.floor(now / 1000)
  const row = sqlite.prepare(`
    SELECT s.snapshot_id, s.region, s.season, s.period, s.fetched_at, s.expires_at, s.status, s.payload, s.source
    FROM meta_snapshot_active a
    JOIN meta_snapshots s ON s.snapshot_id = a.snapshot_id
    WHERE a.region = ? AND s.status = 'ok' AND s.expires_at > ?
    LIMIT 1
  `).get(region, nowSec) as SnapshotRow | undefined
  if (!row) return null
  const payload = parseMetaSnapshotPayload(row.payload)
  if (!payload) return null
  return asStored(row, payload)
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
  const fetchedAt = Math.floor(now / 1000)
  const expiresAt = Math.floor((now + ttlMs) / 1000)
  const season = payload.season ? String(payload.season.id) : null
  const period = payload.periods ? String(payload.periods.current.id) : null
  const parsed = parseMetaSnapshotPayload(payload)
  if (!parsed) throw new Error('Meta snapshot payload failed validation')
  const run = sqlite.transaction(() => {
    const inserted = sqlite.prepare(`
      INSERT INTO meta_snapshots (region, season, period, fetched_at, expires_at, status, payload, source)
      VALUES (?, ?, ?, ?, ?, 'ok', ?, 'blizzard')
    `).run(parsed.region, season, period, fetchedAt, expiresAt, JSON.stringify(parsed)) as { lastInsertRowid: number }
    sqlite.prepare(`
      INSERT INTO meta_snapshot_active (region, snapshot_id)
      VALUES (?, ?)
      ON CONFLICT(region) DO UPDATE SET snapshot_id = excluded.snapshot_id
    `).run(parsed.region, inserted.lastInsertRowid)
  })
  run()
  const stored = readCurrentMetaSnapshot(sqlite, parsed.region, now)
  if (!stored) throw new Error('Meta snapshot was written but could not be read back')
  return stored
}
