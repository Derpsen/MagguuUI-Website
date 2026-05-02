/**
 * POST /api/v1/admin/api-keys
 * Create a new API key. Returns the full key ONLY in this response.
 */

import { randomBytes, createHash } from 'crypto'
import { db } from '~/server/database'
import { apiKeys } from '~/server/database/schema'
import { validateBody, apiKeyCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  // Minting API keys must remain admin-only — viewers/future roles must not
  // be able to escalate by issuing themselves a higher-permission key.
  const auth = requireAdmin(event)
  const body = await readBody(event)
  const data = validateBody(apiKeyCreateSchema, body)

  // Generate a random API key
  const rawKey = 'mgui_' + randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPreview = rawKey.slice(0, 9) + '...' + rawKey.slice(-4)

  const result = db.insert(apiKeys).values({
    name: data.name.trim(),
    keyHash,
    keyPreview,
    permissions: data.permissions || 'read',
  }).returning({
    id: apiKeys.id,
    name: apiKeys.name,
    keyPreview: apiKeys.keyPreview,
    permissions: apiKeys.permissions,
  }).get()

  logActivity({
    action: 'created',
    entityType: 'api-key',
    entityId: result.id,
    entityName: result.name,
    details: { permissions: result.permissions, preview: result.keyPreview },
    userId: auth.userId,
  })

  setResponseStatus(event, 201)
  return apiSuccess({
    ...result,
    key: rawKey, // Full key returned only once!
  })
})
