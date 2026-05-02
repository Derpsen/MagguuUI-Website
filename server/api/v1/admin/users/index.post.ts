/**
 * POST /api/v1/admin/users
 * Create a new admin user.
 */

import bcrypt from 'bcrypt'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import { validateBody, userCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  // Creating users — including admins — is admin-only.
  const auth = requireAdmin(event)
  const body = await readBody(event)
  const data = validateBody(userCreateSchema, body)

  const hash = await bcrypt.hash(data.password, 12)

  try {
    const result = db.insert(users).values({
      username: data.username,
      passwordHash: hash,
      // Default role is 'viewer' — granting 'admin' must be explicit so a
      // forgotten role field can't silently mint another administrator.
      role: data.role || 'viewer',
    }).returning({ id: users.id, username: users.username, role: users.role }).get()

    logActivity({
      action: 'created',
      entityType: 'user',
      entityId: result.id,
      entityName: result.username,
      details: { role: result.role },
      userId: auth.userId,
    })

    setResponseStatus(event, 201)
    return apiSuccess(result)
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      throw createError({ statusCode: 409, message: 'Username already exists' })
    }
    throw e
  }
})
