/**
 * POST /api/v1/auth/webauthn/register-options
 *
 * Generate WebAuthn registration options for the current user.
 * Requires JWT authentication (only logged-in users can register passkeys).
 */

import { generatePasskeyRegistrationOptions } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)

  const options = await generatePasskeyRegistrationOptions(
    auth.userId,
    auth.username,
    event,
  )

  return { success: true, data: options }
})
