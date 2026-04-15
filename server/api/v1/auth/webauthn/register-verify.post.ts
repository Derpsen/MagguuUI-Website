/**
 * POST /api/v1/auth/webauthn/register-verify
 *
 * Verify a WebAuthn registration response and store the passkey.
 * Requires JWT authentication.
 */

import { verifyPasskeyRegistration } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)

  if (!body?.credential) {
    throw createError({ statusCode: 400, message: 'Missing credential data' })
  }

  const deviceName = body.deviceName || 'Passkey'

  const passkey = await verifyPasskeyRegistration(
    auth.userId,
    body.credential,
    deviceName,
    event,
  )

  return apiSuccess({
    id: passkey.id,
    deviceName: passkey.deviceName,
    createdAt: passkey.createdAt,
  })
})
