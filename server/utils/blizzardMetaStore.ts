import type Database from 'better-sqlite3'
/**
 * SQLite cache for Meta snapshots. Rows are addressed by snapshot_id. An
 * active pointer per region is switched only after a complete write, so
 * readers never see a half snapshot. Expired rows (≤ 30 days) are deleted
 * after the pointer is cleared or moved; a tombstone remains so pages can
 * show "Data unavailable" instead of "Collecting data". Nightly run history
 * lives in meta_runs and is cleaned up on the same TTL.
 */

import { clampMetaSnapshotShares, explainMetaSnapshotRejection, parseMetaSnapshotPayload } from '~/utils/metaSnapshot'
import { metaSnapshotCoverage } from './blizzardMetaPolicy'
import { META_MIN_BUILD_SAMPLE, META_REGION, META_SNAPSHOT_TTL_MS, type MetaSnapshotPayload, type MetaTalentLayout } from '~/utils/metaTypes'
import { BLIZZARD_META_LOCK_TTL_MS } from './blizzardMetaLock'
import type { MetaKeyLevelStats, SerializedProfileBucket, SpecPop } from './blizzardMetaAggregate'
import { META_SYNC_STAGING_TABLES_SQL } from '../database/metaSyncStagingSql'

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

export type MetaRunStatus = 'ok' | 'partial' | 'error' | 'skipped' | 'locked'

export type MetaRunRecord = {
  runId: number
  startedAt: number
  endedAt: number
  status: MetaRunStatus
  reason: string | null
  calls: number
  http429: number
  http404: number
  specMismatch: number
  durationMs: number
  snapshotId: number | null
  nPerSpec: Record<string, number> | null
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

type RunRow = {
  run_id: number
  started_at: number
  ended_at: number
  status: string
  reason: string | null
  calls: number
  http_429: number
  http_404: number
  spec_mismatch: number
  duration_ms: number
  snapshot_id: number | null
  n_per_spec: string | null
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

function rowToStored(row: SnapshotRow | undefined): StoredMetaSnapshot | null {
  if (!row) return null
  const payload = parseMetaSnapshotPayload(row.payload)
  if (!payload) return null
  return asStored(row, payload)
}

function parseBuiltMetaSnapshot(payload: MetaSnapshotPayload): MetaSnapshotPayload {
  const parsed = parseMetaSnapshotPayload(clampMetaSnapshotShares(payload))
  if (!parsed) throw new Error(`Meta snapshot payload failed validation: ${explainMetaSnapshotRejection(payload)}`)
  return parsed
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
  const parsed = parseBuiltMetaSnapshot(payload)
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

function hasMetaRunsTable(sqlite: MetaSqlite): boolean {
  return Boolean(sqlite.prepare(`
    SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'meta_runs'
  `).get())
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
    if (hasMetaRunsTable(sqlite)) {
      sqlite.prepare('DELETE FROM meta_runs WHERE ended_at <= ?').run(nowSec - Math.floor(META_SNAPSHOT_TTL_MS / 1000))
    }
  })
  run()
  return removed
}

export function readMetaSnapshotById(
  sqlite: MetaSqlite,
  snapshotId: number,
  now = Date.now(),
): StoredMetaSnapshot | null {
  const nowSec = Math.floor(now / 1000)
  const row = rowById(sqlite, snapshotId)
  if (!row || row.expires_at <= nowSec || row.status === 'expired') return null
  return rowToStored(row)
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

/** Drop a staging row that was never promoted (DoD 1.39: leftover staging must not accumulate). */
export function deleteStagedMetaSnapshot(sqlite: MetaSqlite, snapshotId: number): boolean {
  const result = sqlite.prepare(
    "DELETE FROM meta_snapshots WHERE snapshot_id = ? AND status = 'staging'",
  ).run(snapshotId) as { changes?: number }
  return (result.changes ?? 0) > 0
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
 * The nightly job stages first, runs sanity gates, then calls promote separately.
 */
export function writeMetaSnapshot(
  sqlite: MetaSqlite,
  payload: MetaSnapshotPayload,
  now = Date.now(),
  ttlMs = META_SNAPSHOT_TTL_MS,
): StoredMetaSnapshot {
  const parsed = parseBuiltMetaSnapshot(payload)
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

/**
 * Re-activate the newest unexpired ok snapshot before the current one
 * (DoD 1.27). Older rows are skipped only when their wellCoveredSpecs are
 * below that predecessor's — thin partial intermediates are walked past,
 * but a slightly lower per-spec sample must not jump back to a much older
 * fuller snapshot.
 */
export function rollbackMetaSnapshot(
  sqlite: MetaSqlite,
  region = META_REGION,
  now = Date.now(),
): StoredMetaSnapshot | null {
  const current = readCurrentMetaSnapshot(sqlite, region, now)
  const nowSec = Math.floor(now / 1000)
  const rows = sqlite.prepare(`
    SELECT snapshot_id, region, season, period, fetched_at, expires_at, status, payload, source
    FROM meta_snapshots
    WHERE region = ? AND status = 'ok' AND expires_at > ?
      AND snapshot_id != ?
    ORDER BY fetched_at DESC, snapshot_id DESC
  `).all(region, nowSec, current?.snapshotId ?? -1) as SnapshotRow[]
  let pick: StoredMetaSnapshot | null = null
  let pickWellCovered = 0
  for (const row of rows) {
    const stored = rowToStored(row)
    if (!stored) continue
    const coverage = metaSnapshotCoverage(stored.payload, META_MIN_BUILD_SAMPLE)
    if (!pick) {
      pick = stored
      pickWellCovered = coverage.wellCoveredSpecs
      continue
    }
    if (coverage.wellCoveredSpecs > pickWellCovered) {
      pick = stored
      pickWellCovered = coverage.wellCoveredSpecs
    }
  }
  if (!pick) return null
  return promoteMetaSnapshot(sqlite, pick.snapshotId, region, now)
}

export function recordMetaRun(
  sqlite: MetaSqlite,
  input: {
    startedAt: number
    endedAt?: number
    status: MetaRunStatus
    reason?: string | null
    calls?: number
    http429?: number
    http404?: number
    specMismatch?: number
    snapshotId?: number | null
    nPerSpec?: Record<string, number> | null
  },
): MetaRunRecord {
  const endedAt = input.endedAt ?? Date.now()
  const startedSec = Math.floor(input.startedAt / 1000)
  const endedSec = Math.floor(endedAt / 1000)
  const durationMs = Math.max(0, endedAt - input.startedAt)
  if (!hasMetaRunsTable(sqlite)) {
    return {
      runId: 0,
      startedAt: startedSec,
      endedAt: endedSec,
      status: input.status,
      reason: input.reason ?? null,
      calls: input.calls ?? 0,
      http429: input.http429 ?? 0,
      http404: input.http404 ?? 0,
      specMismatch: input.specMismatch ?? 0,
      durationMs,
      snapshotId: input.snapshotId ?? null,
      nPerSpec: input.nPerSpec ?? null,
    }
  }
  const inserted = sqlite.prepare(`
    INSERT INTO meta_runs (
      started_at, ended_at, status, reason, calls, http_429, http_404,
      spec_mismatch, duration_ms, snapshot_id, n_per_spec
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    startedSec,
    endedSec,
    input.status,
    input.reason ?? null,
    input.calls ?? 0,
    input.http429 ?? 0,
    input.http404 ?? 0,
    input.specMismatch ?? 0,
    durationMs,
    input.snapshotId ?? null,
    input.nPerSpec ? JSON.stringify(input.nPerSpec) : null,
  ) as { lastInsertRowid: number }
  const read = readLastMetaRun(sqlite)
  if (!read) throw new Error('Meta run was written but could not be read back')
  if (read.runId !== Number(inserted.lastInsertRowid)) return { ...read, runId: Number(inserted.lastInsertRowid) }
  return read
}

export function readLastMetaRun(sqlite: MetaSqlite): MetaRunRecord | null {
  if (!hasMetaRunsTable(sqlite)) return null
  const row = sqlite.prepare(`
    SELECT run_id, started_at, ended_at, status, reason, calls, http_429, http_404,
           spec_mismatch, duration_ms, snapshot_id, n_per_spec
    FROM meta_runs
    ORDER BY run_id DESC
    LIMIT 1
  `).get() as RunRow | undefined
  if (!row) return null
  let nPerSpec: Record<string, number> | null = null
  if (row.n_per_spec) {
    try {
      const parsed = JSON.parse(row.n_per_spec) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) nPerSpec = parsed as Record<string, number>
    } catch {
      nPerSpec = null
    }
  }
  return {
    runId: row.run_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status as MetaRunStatus,
    reason: row.reason,
    calls: row.calls,
    http429: row.http_429,
    http404: row.http_404,
    specMismatch: row.spec_mismatch,
    durationMs: row.duration_ms,
    snapshotId: row.snapshot_id,
    nPerSpec,
  }
}

export function metaSnapshotAgeHours(snapshot: StoredMetaSnapshot | null, now = Date.now()): number | null {
  if (!snapshot) return null
  return Math.max(0, (now / 1000 - snapshot.fetchedAt) / 3600)
}

export type MetaSyncRunContext = {
  season: MetaSnapshotPayload['season']
  periods: MetaSnapshotPayload['periods']
  realmCount: number
  leaderboards: { planned: number, ok: number, failed: number }
  specPop: SpecPop[]
  totalCharacters: number
  /** @deprecated Prefer keyLevelStats; kept for mid-run staging compatibility. */
  allKeyLevels: number[]
  keyLevelStats?: MetaKeyLevelStats
  dropped?: { ingest: number, trim: number, total: number }
}

export type MetaSyncSpecStage = {
  specId: number
  className: string
  specName: string
  bucketsByHash: Record<string, SerializedProfileBucket>
  versionsByHash: Record<string, number[]>
  layout: MetaTalentLayout | null
}

export function ensureMetaSyncStagingTables(sqlite: MetaSqlite) {
  sqlite.exec(META_SYNC_STAGING_TABLES_SQL)
}

export function clearMetaSyncStaging(sqlite: MetaSqlite, runToken: string) {
  ensureMetaSyncStagingTables(sqlite)
  sqlite.prepare('DELETE FROM meta_sync_spec_staging WHERE run_token = ?').run(runToken)
  sqlite.prepare('DELETE FROM meta_sync_run_staging WHERE run_token = ?').run(runToken)
}

/** Drop leftover staging whose run is older than the lock TTL. Fresh tokens (a live run) stay. */
export function clearExpiredMetaSyncStaging(sqlite: MetaSqlite, now = Date.now(), ttlMs = BLIZZARD_META_LOCK_TTL_MS) {
  ensureMetaSyncStagingTables(sqlite)
  const cutoff = Math.floor((now - ttlMs) / 1000)
  sqlite.prepare(`
    DELETE FROM meta_sync_spec_staging
    WHERE run_token IN (SELECT run_token FROM meta_sync_run_staging WHERE created_at <= ?)
       OR run_token NOT IN (SELECT run_token FROM meta_sync_run_staging)
  `).run(cutoff)
  sqlite.prepare('DELETE FROM meta_sync_run_staging WHERE created_at <= ?').run(cutoff)
}

export function writeMetaSyncRunContext(sqlite: MetaSqlite, runToken: string, context: MetaSyncRunContext, now = Date.now()) {
  ensureMetaSyncStagingTables(sqlite)
  sqlite.prepare(`
    INSERT INTO meta_sync_run_staging (run_token, payload, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(run_token) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at
  `).run(runToken, JSON.stringify(context), Math.floor(now / 1000))
}

export function writeMetaSyncSpecAggregate(sqlite: MetaSqlite, runToken: string, stage: MetaSyncSpecStage) {
  ensureMetaSyncStagingTables(sqlite)
  sqlite.prepare(`
    INSERT INTO meta_sync_spec_staging (run_token, spec_id, class_name, spec_name, payload)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(run_token, spec_id) DO UPDATE SET
      class_name = excluded.class_name,
      spec_name = excluded.spec_name,
      payload = excluded.payload
  `).run(runToken, stage.specId, stage.className, stage.specName, JSON.stringify({
    bucketsByHash: stage.bucketsByHash,
    versionsByHash: stage.versionsByHash,
    layout: stage.layout,
  }))
}

export function readMetaSyncRunContext(sqlite: MetaSqlite, runToken: string): MetaSyncRunContext | null {
  ensureMetaSyncStagingTables(sqlite)
  const row = sqlite.prepare('SELECT payload FROM meta_sync_run_staging WHERE run_token = ?').get(runToken) as { payload: string } | undefined
  if (!row?.payload) return null
  try {
    return JSON.parse(row.payload) as MetaSyncRunContext
  } catch {
    return null
  }
}

export function readMetaSyncSpecAggregates(sqlite: MetaSqlite, runToken: string): MetaSyncSpecStage[] {
  ensureMetaSyncStagingTables(sqlite)
  const rows = sqlite.prepare('SELECT spec_id, class_name, spec_name, payload FROM meta_sync_spec_staging WHERE run_token = ? ORDER BY spec_id').all(runToken) as Array<{
    spec_id: number
    class_name: string
    spec_name: string
    payload: string
  }>
  const out: MetaSyncSpecStage[] = []
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as { bucketsByHash?: Record<string, SerializedProfileBucket>, versionsByHash?: Record<string, number[]>, layout?: MetaTalentLayout | null }
      out.push({
        specId: row.spec_id,
        className: row.class_name,
        specName: row.spec_name,
        bucketsByHash: parsed.bucketsByHash ?? {},
        versionsByHash: parsed.versionsByHash && typeof parsed.versionsByHash === 'object' ? parsed.versionsByHash : {},
        layout: parsed.layout ?? null,
      })
    } catch {
      /* skip a corrupt staging row */
    }
  }
  return out
}
