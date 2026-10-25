/**
 * After personal data is deleted (consent withdrawn, retention) the old page images can still sit in the write-ahead log
 * until the next checkpoint. `secure_delete = ON` (database/index.ts) zeroes freed pages in the main file; this truncates
 * the WAL file itself, so "deleted right away" is true on disk too. Pure: a `pragma` handle only (unit tested in memory).
 */
import type Database from 'better-sqlite3'

export function checkpointWal(sqlite: Pick<Database.Database, 'pragma'>, log: (message: string, error: unknown) => void = (m, e) => console.error(m, e)): boolean {
  try {
    sqlite.pragma('wal_checkpoint(TRUNCATE)')
    return true
  } catch (e) {
    log('[Cleanup] WAL checkpoint failed:', e)
    return false
  }
}
