/**
 * Shared typings for the website boot split (`server/plugins/init.ts`).
 * Boot helpers take a db/sqlite pair so characterization tests can use an
 * in-memory database and never open the process data file.
 */
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { Database } from 'better-sqlite3'
import type * as schema from '~/server/database/schema'

export type WebsiteBootDb = BetterSQLite3Database<typeof schema>
export type WebsiteBootSqlite = Database
export type WebsiteBootSetting = {
  id: number
  key: string
  value: string
  updatedAt: Date
}
