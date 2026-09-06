/**
 * Shared admin CRUD helpers for sortable string entities.
 *
 * Profiles / WowUp / layouts (and FAQ reorder) used nearly identical
 * route-id parsing, transactional reorder, and bulk-delete loops.
 * Keep handlers thin and behavior-identical.
 */

import { eq, inArray } from 'drizzle-orm'
import type { AnySQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { H3Event } from 'h3'
import { db, sqlite } from '~/server/database'

/** Parse :id from the route; same NaN guard the handlers used before. */
export function parseRouteId(event: H3Event, name = 'id'): number {
  const id = Number(getRouterParam(event, name))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }
  return id
}

type SortableEntityTable = SQLiteTable & {
  id: AnySQLiteColumn
  sortOrder: AnySQLiteColumn
  updatedAt: AnySQLiteColumn
}

/**
 * Bulk-update sortOrder inside one SQLite transaction.
 * `touchUpdatedAt` defaults true (string entities); FAQ reorder historically
 * only wrote sortOrder — pass false to preserve that.
 */
export function reorderBySortOrder(
  table: SortableEntityTable,
  items: Array<{ id: number, sortOrder: number }>,
  options: { touchUpdatedAt?: boolean } = {},
): void {
  const touchUpdatedAt = options.touchUpdatedAt !== false
  const now = new Date()

  sqlite.transaction(() => {
    for (const item of items) {
      if (touchUpdatedAt) {
        db.update(table)
          .set({ sortOrder: item.sortOrder, updatedAt: now })
          .where(eq(table.id, item.id))
          .run()
      }
      else {
        db.update(table)
          .set({ sortOrder: item.sortOrder })
          .where(eq(table.id, item.id))
          .run()
      }
    }
  })()
}

type DeletableEntityTable = SQLiteTable & {
  id: AnySQLiteColumn
}

/** Delete many rows by primary key. */
export function bulkDeleteByIds(table: DeletableEntityTable, ids: number[]): void {
  db.delete(table).where(inArray(table.id, ids)).run()
}
