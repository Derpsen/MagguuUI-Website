/**
 * PUT /api/v1/admin/passkeys/:id
 *
 * Rename a passkey.
 */

import { renamePasskey } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid passkey ID' })
  }

  if (!body?.deviceName?.trim()) {
    throw createError({ statusCode: 400, message: 'Device name is required' })
  }

  const updated = renamePasskey(id, auth.userId, body.deviceName.trim())
  return { success: true, data: updated }
})
