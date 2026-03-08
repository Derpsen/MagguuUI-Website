/**
 * GET /api/v1/admin/passkeys
 *
 * List all passkeys for the current user.
 */

import { getUserPasskeys } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const passkeysList = getUserPasskeys(auth.userId)
  return { success: true, data: passkeysList }
})
