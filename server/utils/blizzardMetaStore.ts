import type Database from 'better-sqlite3'
/**
 * SQLite cache for Meta snapshots. A successful snapshot is kept for at most
 * 30 days; expired rows are deleted. Failed runs do not replace a still-valid
 * snapshot. Tests pass an in-memory connection so they never touch the app DB.
 */

import { parseMetaSnapshotPayload } from '~/utils/metaSnapshot'
import { META_REGION, META_SNAPSHOT_TTL_MS, type MetaSnapshotPayload } from '~/utils/metaTypes'

export type MetaSqlite = Database.Database

export type StoredMetaSnapshot = {
  id: number
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
  id: number
  region: string
  season: string | null
  period: string | null
  fetched_at: number
  expires_at: number
  status: string
  payload: string
  source: string
}

export function deleteExpiredMetaSnapshots(sqlite: MetaSqlite, now = Date.now()): number {
  const nowSec = Math.floor(now / 1000)
  const result = sqlite.prepare('DELETE FROM meta_snapshots WHERE expires_at <= ?').run(nowSec) as { changes?: number }
  return result.changes ?? 0
}

export function readCurrentMetaSnapshot(
  sqlite: MetaSqlite,
  region = META_REGION,
  now = Date.now(),
): StoredMetaSnapshot | null {
  const nowSec = Math.floor(now / 1000)
  const row = sqlite.prepare(`
    SELECT id, region, season, period, fetched_at, expires_at, status, payload, source
    FROM meta_snapshots
    WHERE region = ? AND status = 'ok' AND expires_at > ?
    ORDER BY fetched_at DESC
    LIMIT 1
  `).get(region, nowSec) as SnapshotRow | undefined
  if (!row) return null
  const payload = parseMetaSnapshotPayload(row.payload)
  if (!payload) return null
  return {
    id: row.id,
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

export function writeMetaSnapshot(
  sqlite: MetaSqlite,
  payload: MetaSnapshotPayload,
  now = Date.now(),
  ttlMs = META_SNAPSHOT_TTL_MS,
): StoredMetaSnapshot {
  const fetchedAt = Math.floor(now / 1000)
  const expiresAt = Math.floor((now + ttlMs) / 1000)
  const season = payload.season ? String(payload.season.id) : null
  const period = payload.period ? String(payload.period.id) : null
  sqlite.prepare(`
    INSERT INTO meta_snapshots (region, season, period, fetched_at, expires_at, status, payload, source)
    VALUES (?, ?, ?, ?, ?, 'ok', ?, 'blizzard')
  `).run(payload.region, season, period, fetchedAt, expiresAt, JSON.stringify(payload))
  const stored = readCurrentMetaSnapshot(sqlite, payload.region, now)
  if (!stored) throw new Error('Meta snapshot was written but could not be read back')
  return stored
}
