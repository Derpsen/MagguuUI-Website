/**
 * POST /api/v1/auth/webauthn/login-options
 *
 * Generate WebAuthn authentication options for passkey login.
 * Public endpoint — no auth required.
 * Also returns whether any passkeys exist.
 */

import { generatePasskeyAuthenticationOptions, hasAnyPasskeys } from '~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const ipKey = rateLimitIpKey(ip)

  // Throttle anonymous probing of this endpoint. Without a limit, an attacker
  // could harvest the full credentialId list (and AAGUID/transport hints) and
  // measure registration count over time. 30 requests / 10 min is plenty for
  // a legitimate user retrying a failed prompt; harvesting at scale needs much
  // more.
  const { allowed, retryAfter } = checkRateLimit(`webauthn-options:${ipKey}`, 30, 10 * 60 * 1000, 10 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please wait a moment.',
    })
  }

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
