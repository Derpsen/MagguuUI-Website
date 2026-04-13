/**
 * PUT /api/v1/admin/passkeys/:id
 *
 * Rename a passkey.
 */

import { renamePasskey } from '~/server/utils/webauthn'
import { validateBody, passkeyRenameSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid passkey ID' })
  }

  const body = await readBody(event)
  const data = validateBody(passkeyRenameSchema, body)

  const updated = renamePasskey(id, auth.userId, data.deviceName.trim())
  return apiSuccess(updated)
})
