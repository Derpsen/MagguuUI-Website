/**
 * PUT /api/v1/admin/fields/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { fieldDefinitions } from '~/server/database/schema'
import { validateBody, fieldDefinitionUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(fieldDefinitions).where(eq(fieldDefinitions.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Field not found' })

  const body = await readBody(event)
  const data = validateBody(fieldDefinitionUpdateSchema, body)

  const result = db.update(fieldDefinitions)
    .set({
      ...(data.fieldLabel !== undefined && { fieldLabel: data.fieldLabel }),
      ...(data.fieldType !== undefined && { fieldType: data.fieldType }),
      ...(data.fieldOptions !== undefined && { fieldOptions: data.fieldOptions != null ? JSON.stringify(data.fieldOptions) : null }),
      ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(fieldDefinitions.id, id))
    .returning()
    .get()

  return apiSuccess(result)
})
