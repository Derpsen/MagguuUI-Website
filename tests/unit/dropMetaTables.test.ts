import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'

describe('Meta table removal', () => {
  it('drops leftover Meta snapshot and sync tables on boot', () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(`
      CREATE TABLE meta_snapshots (snapshot_id INTEGER PRIMARY KEY, payload TEXT);
      CREATE TABLE meta_snapshot_active (region TEXT PRIMARY KEY, snapshot_id INTEGER);
      CREATE TABLE meta_runs (run_id INTEGER PRIMARY KEY);
      CREATE TABLE meta_sync_run_staging (run_token TEXT PRIMARY KEY, payload TEXT);
      CREATE TABLE meta_sync_spec_staging (run_token TEXT, spec_id INTEGER, PRIMARY KEY (run_token, spec_id));
      CREATE TABLE meta_sync_lock (id INTEGER PRIMARY KEY);
    `)
    initializeDatabase(sqlite)
    const leftover = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'meta_%' ORDER BY name",
    ).all() as Array<{ name: string }>
    assert.deepEqual(leftover, [])
  })

  it('is safe to run on a database that never had Meta tables', () => {
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    const leftover = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'meta_%'",
    ).all()
    assert.deepEqual(leftover, [])
  })
})
