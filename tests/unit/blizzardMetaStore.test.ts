import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_REGION, META_SNAPSHOT_TTL_MS } from '../../utils/metaTypes'
import { deleteExpiredMetaSnapshots, readCurrentMetaSnapshot, writeMetaSnapshot } from '../../server/utils/blizzardMetaStore'

function open() {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE meta_snapshots (
      snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      snapshot_id INTEGER NOT NULL
    );
  `)
  return sqlite
}

function payload() {
  const parsed = parseMetaSnapshotPayload(readFileSync(new URL('../fixtures/blizzard-meta/snapshot.json', import.meta.url), 'utf8'))
  assert.ok(parsed)
  return parsed
}

describe('meta snapshot store', () => {
  it('reads a current snapshot and hides expired rows after they are deleted', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    const written = writeMetaSnapshot(sqlite, payload(), now, META_SNAPSHOT_TTL_MS)
    assert.ok(written.snapshotId >= 1)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now)
    assert.ok(current)
    assert.equal(current.payload.classes[0]?.slug, 'mage')
    assert.equal(current.snapshotId, written.snapshotId)
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, now + META_SNAPSHOT_TTL_MS + 1), null)
    const removed = deleteExpiredMetaSnapshots(sqlite, now + META_SNAPSHOT_TTL_MS + 1)
    assert.equal(removed, 1)
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, now + META_SNAPSHOT_TTL_MS + 1), null)
  })

  it('does not return a snapshot after expiry even if the row is still present', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    writeMetaSnapshot(sqlite, payload(), now, 1_000)
    assert.ok(readCurrentMetaSnapshot(sqlite, META_REGION, now))
    assert.equal(readCurrentMetaSnapshot(sqlite, META_REGION, now + 1_001), null)
  })
})
