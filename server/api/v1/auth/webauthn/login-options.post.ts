/**
 * POST /api/v1/auth/webauthn/login-options
 *
 * Generate WebAuthn authentication options for passkey login.
 * Public endpoint — no auth required.
 * Also returns whether any passkeys exist.
 */

import { generatePasskeyAuthenticationOptions, hasAnyPasskeys } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  // Check if passkeys exist at all
  if (!hasAnyPasskeys()) {
    return {
      success: true,
      data: null,
      meta: { hasPasskeys: false },
    }
  }

  const options = await generatePasskeyAuthenticationOptions(event)

  return {
    success: true,
    data: options,
    meta: { hasPasskeys: true },
  }
})
