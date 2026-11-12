/** SQLite DDL for the cross-process Meta sync lock. Shared by bootstrap and the lock helper. */
export const META_SYNC_LOCK_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS meta_sync_lock (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    owner_token TEXT NOT NULL,
    held_until INTEGER NOT NULL
  );
`
