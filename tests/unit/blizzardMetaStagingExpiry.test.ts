import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { BLIZZARD_META_LOCK_TTL_MS } from '../../server/utils/blizzardMetaLock'
import { clearExpiredMetaSyncStaging, ensureMetaSyncStagingTables } from '../../server/utils/blizzardMetaStore'

describe('expired meta staging clear', () => {
  it('drops tokens older than the lock TTL and leaves a recent token unchanged', () => {
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    ensureMetaSyncStagingTables(sqlite)
    const now = 1_700_000_000_000
    const recent = Math.floor(now / 1000)
    const stale = Math.floor((now - BLIZZARD_META_LOCK_TTL_MS) / 1000) - 10
    sqlite.prepare('INSERT INTO meta_sync_run_staging (run_token, payload, created_at) VALUES (?, ?, ?)').run('fresh', '{}', recent)
    sqlite.prepare('INSERT INTO meta_sync_spec_staging (run_token, spec_id, class_name, spec_name, payload) VALUES (?, ?, ?, ?, ?)').run('fresh', 62, 'Mage', 'Fire', '{}')
    sqlite.prepare('INSERT INTO meta_sync_run_staging (run_token, payload, created_at) VALUES (?, ?, ?)').run('stale', '{}', stale)
    sqlite.prepare('INSERT INTO meta_sync_spec_staging (run_token, spec_id, class_name, spec_name, payload) VALUES (?, ?, ?, ?, ?)').run('stale', 62, 'Mage', 'Fire', '{}')
    sqlite.prepare('INSERT INTO meta_sync_spec_staging (run_token, spec_id, class_name, spec_name, payload) VALUES (?, ?, ?, ?, ?)').run('orphan', 63, 'Mage', 'Frost', '{}')

    clearExpiredMetaSyncStaging(sqlite, now)

    const runs = sqlite.prepare('SELECT run_token FROM meta_sync_run_staging ORDER BY run_token').all() as Array<{ run_token: string }>
    const specs = sqlite.prepare('SELECT run_token FROM meta_sync_spec_staging ORDER BY run_token').all() as Array<{ run_token: string }>
    assert.deepEqual(runs.map(row => row.run_token), ['fresh'])
    assert.deepEqual(specs.map(row => row.run_token), ['fresh'])
  })
})
