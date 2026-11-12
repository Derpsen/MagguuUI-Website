/** SQLite DDL for Meta nightly staging tables. Shared by bootstrap and the store. */
export const META_SYNC_STAGING_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS meta_sync_run_staging (
    run_token TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta_sync_spec_staging (
    run_token TEXT NOT NULL,
    spec_id INTEGER NOT NULL,
    class_name TEXT NOT NULL,
    spec_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (run_token, spec_id)
  );
  CREATE INDEX IF NOT EXISTS idx_meta_sync_spec_staging_run ON meta_sync_spec_staging(run_token);
`
