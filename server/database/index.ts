/**
 * Database Connection + Table Initialization
 *
 * - Opens SQLite with WAL mode
 * - Creates ALL tables on startup (CREATE IF NOT EXISTS)
 * - Safe to run every time - idempotent
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import * as schema from './schema'
import { initializeDatabase } from './bootstrap'

const DB_PATH = join(process.cwd(), 'data', 'magguuui.db')

mkdirSync(join(process.cwd(), 'data'), { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 5000')
sqlite.pragma('foreign_keys = ON')

initializeDatabase(sqlite)

export const db = drizzle(sqlite, { schema })
export { sqlite }
export default db
