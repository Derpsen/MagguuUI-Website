/**
 * GET /api/v1/admin/system/db-backup
 *
 * Download a backup of the SQLite database.
 * Performs WAL checkpoint before backup for data integrity.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { sqlite } from '~/server/database'

export default defineEventHandler(async (event) => {
  // Auth already enforced by server/middleware/admin-api.ts for /api/v1/admin/*

  const ip = getClientIp(event)
  const { allowed, retryAfter } = checkRateLimit(`admin-db-backup:${ip}`, 6, 60 * 60 * 1000, 60 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      message: `Too many backup downloads. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    })
  }

  const dbPath = join(process.cwd(), 'data', 'magguuui.db')

  // Checkpoint WAL to ensure all data is in the main DB file
  try {
    sqlite.pragma('wal_checkpoint(TRUNCATE)')
  } catch { /* ok */ }

  // Read the database file (async — do not block the event loop)
  let dbBuffer: Buffer
  try {
    dbBuffer = await readFile(dbPath)
  } catch {
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
