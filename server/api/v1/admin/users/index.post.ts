/**
 * POST /api/v1/admin/users
 * Create a new admin user.
 */

import bcrypt from 'bcrypt'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.username || !body?.password) {
    throw createError({ statusCode: 400, message: 'Username and password required' })
  }

  // Validate password strength
  const { passwordSchema } = await import('~/server/utils/validation')
  const pwResult = passwordSchema.safeParse(body.password)
  if (!pwResult.success) {
    throw createError({ statusCode: 400, message: pwResult.error.issues[0].message })
  }

  const hash = await bcrypt.hash(body.password, 12)

  try {
    const result = db.insert(users).values({
      username: body.username,
      passwordHash: hash,
      role: body.role || 'admin',
    }).returning({ id: users.id, username: users.username, role: users.role }).get()

    setResponseStatus(event, 201)
    return { success: true, data: result }
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      throw createError({ statusCode: 409, message: 'Username already exists' })
    }
    throw e
  }
})
