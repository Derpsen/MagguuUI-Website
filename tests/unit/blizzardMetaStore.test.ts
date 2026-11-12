import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_REGION, META_SNAPSHOT_TTL_MS } from '../../utils/metaTypes'
import {
  deleteExpiredMetaSnapshots,
  promoteMetaSnapshot,
  readCurrentMetaSnapshot,
  readMetaSnapshotState,
  writeMetaSnapshot,
  writeStagedMetaSnapshot,
} from '../../server/utils/blizzardMetaStore'

function open() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  initializeDatabase(sqlite)
  return sqlite
}

function payload() {
  const parsed = parseMetaSnapshotPayload(readFileSync(new URL('../fixtures/blizzard-meta/snapshot.json', import.meta.url), 'utf8'))
  assert.ok(parsed)
  return parsed
}

describe('meta snapshot store', () => {
  it('reads a current snapshot and reports empty before the first write', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    assert.deepEqual(readMetaSnapshotState(sqlite, META_REGION, now), { status: 'empty' })
    const written = writeMetaSnapshot(sqlite, payload(), now, META_SNAPSHOT_TTL_MS)
    assert.ok(written.snapshotId >= 1)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now)
    assert.ok(current)
    assert.equal(current.payload.classes[0]?.slug, 'mage')
    assert.equal(current.snapshotId, written.snapshotId)
  })

  it('does not return a snapshot after expiry even if the row is still present', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    writeMetaSnapshot(sqlite, payload(), now, 1_000)
    assert.ok(readCurrentMetaSnapshot(sqlite, META_REGION, now))
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, now + 1_001), null)
    assert.equal(readMetaSnapshotState(sqlite, META_REGION, now + 1_001).status, 'unavailable')
  })

  it('deletes expired unreferenced rows without a foreign-key failure and keeps Data unavailable', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    writeMetaSnapshot(sqlite, payload(), now, 1_000)
    sqlite.pragma('foreign_keys = ON')
    const later = now + 1_001
    assert.equal(readMetaSnapshotState(sqlite, META_REGION, later).status, 'unavailable')
    assert.doesNotThrow(() => deleteExpiredMetaSnapshots(sqlite, later))
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, later), null)
    assert.equal(readMetaSnapshotState(sqlite, META_REGION, later).status, 'unavailable')
  })

  it('keeps the last good snapshot active if promote never runs after a staging write', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    const first = writeMetaSnapshot(sqlite, payload(), now, META_SNAPSHOT_TTL_MS)
    const staged = writeStagedMetaSnapshot(sqlite, payload(), now + 1_000, META_SNAPSHOT_TTL_MS)
    assert.notEqual(staged.snapshotId, first.snapshotId)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now + 1_000)
    assert.ok(current)
    assert.equal(current.snapshotId, first.snapshotId)
    const promoted = promoteMetaSnapshot(sqlite, staged.snapshotId, META_REGION, now + 1_000)
    assert.equal(promoted.snapshotId, staged.snapshotId)
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, now + 1_000)?.snapshotId, staged.snapshotId)
  })

  it('renames a leftover meta_snapshots.id column so an existing database can store a snapshot', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    sqlite.exec(`
      CREATE TABLE meta_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT NOT NULL,
        season TEXT,
        period TEXT,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'blizzard'
      );
      CREATE TABLE meta_snapshot_active (
        region TEXT PRIMARY KEY,
        snapshot_id INTEGER NOT NULL,
        FOREIGN KEY (snapshot_id) REFERENCES meta_snapshots(id) ON DELETE CASCADE
      );
    `)
    initializeDatabase(sqlite)
    const cols = sqlite.prepare('PRAGMA table_info(meta_snapshots)').all() as Array<{ name: string }>
    assert.ok(cols.some(c => c.name === 'snapshot_id'))
    assert.equal(cols.some(c => c.name === 'id'), false)
    const written = writeMetaSnapshot(sqlite, payload())
    assert.equal(readCurrentMetaSnapshot(sqlite)?.snapshotId, written.snapshotId)
  })
})
