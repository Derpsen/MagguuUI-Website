/**
 * POST /api/v1/admin/fields
 * Create a new field definition
 */

import { db } from '~/server/database'
import { fieldDefinitions } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.entityType || !body?.fieldName || !body?.fieldLabel) {
    throw createError({ statusCode: 400, message: 'entityType, fieldName and fieldLabel are required' })
  }

  // Sanitize fieldName to be a valid key
  const fieldName = body.fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  const result = db.insert(fieldDefinitions).values({
    entityType: body.entityType,
    fieldName,
    fieldLabel: body.fieldLabel,
    fieldType: body.fieldType || 'text',
    fieldOptions: body.fieldOptions ? JSON.stringify(body.fieldOptions) : null,
    isRequired: body.isRequired ?? false,
    sortOrder: body.sortOrder ?? 0,
  }).returning().get()

  setResponseStatus(event, 201)
  return { success: true, data: result }
})
