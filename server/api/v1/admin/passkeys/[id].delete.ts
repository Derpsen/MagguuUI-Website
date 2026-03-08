/**
 * DELETE /api/v1/admin/passkeys/:id
 *
 * Delete a passkey. User must have at least one remaining passkey
 * or password access to avoid locking themselves out.
 */

import { deletePasskey, getUserPasskeyCount } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid passkey ID' })
  }

  const deleted = deletePasskey(id, auth.userId)
  return { success: true, data: { id: deleted.id } }
})
