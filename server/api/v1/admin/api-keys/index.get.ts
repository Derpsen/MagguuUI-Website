/**
 * GET /api/v1/admin/api-keys
 * List all API keys (without actual key, only preview).
 */

import { db } from '~/server/database'
import { apiKeys } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const rows = db.select({
    id: apiKeys.id,
    name: apiKeys.name,
    keyPreview: apiKeys.keyPreview,
    permissions: apiKeys.permissions,
    lastUsed: apiKeys.lastUsed,
    createdAt: apiKeys.createdAt,
  }).from(apiKeys).all()

  return apiSuccess(rows)
})
