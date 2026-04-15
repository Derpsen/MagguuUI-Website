export const PRIVATE_API_HEADER_VALUES = {
  cacheControl: 'private, no-store, no-cache, must-revalidate',
  pragma: 'no-cache',
  expires: '0',
  xRobotsTag: 'noindex, nofollow, noarchive',
} as const

export const PRIVATE_API_VARY_HEADERS = ['Cookie', 'Authorization'] as const

export function mergeVary(existing: string | number | string[] | undefined, values: readonly string[]) {
  const current = Array.isArray(existing)
    ? existing.join(',')
    : typeof existing === 'number'
      ? String(existing)
      : existing || ''

  const merged = new Set(
    current
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  )

  for (const value of values) {
    merged.add(value)
  }

  return Array.from(merged).join(', ')
}

export function applyPrivateApiHeadersToRecord(
  headers: Record<string, string | number | string[] | undefined>,
  existingVary?: string | number | string[] | undefined,
) {
  headers['Cache-Control'] = PRIVATE_API_HEADER_VALUES.cacheControl
  headers.Pragma = PRIVATE_API_HEADER_VALUES.pragma
  headers.Expires = PRIVATE_API_HEADER_VALUES.expires
  headers['X-Robots-Tag'] = PRIVATE_API_HEADER_VALUES.xRobotsTag
  headers.Vary = mergeVary(existingVary ?? headers.Vary, PRIVATE_API_VARY_HEADERS)
}

import type { H3Event } from 'h3'

export function applyPrivateApiHeaders(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', PRIVATE_API_HEADER_VALUES.cacheControl)
  setResponseHeader(event, 'Pragma', PRIVATE_API_HEADER_VALUES.pragma)
  setResponseHeader(event, 'Expires', PRIVATE_API_HEADER_VALUES.expires)
  setResponseHeader(event, 'X-Robots-Tag', PRIVATE_API_HEADER_VALUES.xRobotsTag)

  const existingVary = event.node.res.getHeader('vary')
  event.node.res.setHeader('Vary', mergeVary(existingVary, PRIVATE_API_VARY_HEADERS))
}
