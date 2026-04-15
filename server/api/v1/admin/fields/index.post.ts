/**
 * POST /api/v1/admin/fields
 * Create a new field definition
 */

import { db } from '~/server/database'
import { fieldDefinitions } from '~/server/database/schema'
import { validateBody, fieldDefinitionCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const data = validateBody(fieldDefinitionCreateSchema, body)

  // Sanitize fieldName to be a valid key
  const fieldName = data.fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  const result = db.insert(fieldDefinitions).values({
    entityType: data.entityType,
    fieldName,
    fieldLabel: data.fieldLabel,
    fieldType: data.fieldType || 'text',
    fieldOptions: data.fieldOptions != null ? JSON.stringify(data.fieldOptions) : null,
    isRequired: data.isRequired ?? false,
    sortOrder: data.sortOrder ?? 0,
  }).returning().get()

  logActivity({
    action: 'created',
    entityType: 'field',
    entityId: result.id,
    entityName: `${result.entityType}.${result.fieldName}`,
    details: { label: result.fieldLabel, type: result.fieldType },
    userId: auth.userId,
  })

  setResponseStatus(event, 201)
  return apiSuccess(result)
})
