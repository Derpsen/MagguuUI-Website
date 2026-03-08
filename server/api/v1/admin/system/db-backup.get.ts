/**
 * GET /api/v1/admin/system/db-backup
 *
 * Download a backup of the SQLite database.
 * Performs WAL checkpoint before backup for data integrity.
 */

import { readFileSync, statSync } from 'fs'
import { join } from 'path'
import { sqlite } from '~/server/database'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const dbPath = join(process.cwd(), 'data', 'magguuui.db')

  // Checkpoint WAL to ensure all data is in the main DB file
  try {
    sqlite.pragma('wal_checkpoint(TRUNCATE)')
  } catch { /* ok */ }

  // Read the database file
  let dbBuffer: Buffer
  try {
    dbBuffer = readFileSync(dbPath)
  } catch (e: any) {
    throw createError({ statusCode: 500, message: 'Could not read database file' })
  }

  // Generate filename with timestamp
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `magguuui-backup-${timestamp}.db`

  // Set response headers for file download
  setResponseHeader(event, 'Content-Type', 'application/x-sqlite3')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  setResponseHeader(event, 'Content-Length', String(dbBuffer.length))

  return dbBuffer
})
