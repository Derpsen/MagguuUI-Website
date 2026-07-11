import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { applyPrivateApiHeaders } from '~/server/utils/privateApiHeaders'

export function requireSyncApiBearer(event: H3Event) {
  applyPrivateApiHeaders(event)
  const expected = useRuntimeConfig().apiBearerToken || ''
  const authorization = getHeader(event, 'authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(authorization)
  const provided = match?.[1] || ''
  const valid = safeTokenEqual(provided, expected)

  if (!expected) {
    throw createError({ statusCode: 503, message: 'Sync API is not configured' })
  }
  if (!valid) {
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}

function safeTokenEqual(provided: string, expected: string) {
  const providedHash = createHash('sha256').update(provided, 'utf8').digest()
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(providedHash, expectedHash)
}
