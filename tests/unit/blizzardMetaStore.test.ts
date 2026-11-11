import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { META_REGION, META_SNAPSHOT_TTL_MS, type MetaSnapshotPayload } from '../../utils/metaTypes'
import { deleteExpiredMetaSnapshots, readCurrentMetaSnapshot, writeMetaSnapshot } from '../../server/utils/blizzardMetaStore'

function open() {
  const sqlite = new Database(':memory:')
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
  `)
  return sqlite
}

function payload(overrides: Partial<MetaSnapshotPayload> = {}): MetaSnapshotPayload {
  return {
    region: META_REGION,
    focus: 'mythic-plus',
    season: { id: 14, name: 'Season 14' },
    period: { id: 999 },
    sampled: { realms: 1, leaderboards: 1, characters: 2, profiles: 1 },
    freshness: { fetchedAt: 1_700_000_000, characters: 2, keyLevels: { min: 18, max: 20 }, region: META_REGION, source: 'blizzard' },
    classes: [{
      slug: 'mage',
      name: 'Mage',
      characterCount: 2,
      specs: [{
        slug: 'fire',
        name: 'Fire',
        characterCount: 2,
        share: 1,
        profileCount: 1,
        belowMinSample: true,
        keyLevels: { min: 18, max: 20, average: 19 },
        heroSplit: [],
        loadouts: [],
        talents: { class: [], spec: [], hero: [] },
        stats: [],
        gearSlots: [],
        trinkets: [],
        rings: [],
        embellishments: [],
        enchants: [],
        gems: [],
        races: [],
      }],
    }],
    ...overrides,
  }
}

describe('meta snapshot store', () => {
  it('reads a current snapshot and hides expired rows after they are deleted', () => {
    const sqlite = open()
    const now = 1_700_000_000_000
    writeMetaSnapshot(sqlite, payload(), now, META_SNAPSHOT_TTL_MS)
    const current = readCurrentMetaSnapshot(sqlite, META_REGION, now)
    assert.ok(current)
    assert.equal(current.payload.classes[0]?.slug, 'mage')
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
