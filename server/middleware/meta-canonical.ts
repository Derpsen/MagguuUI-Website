/**
 * Send uppercase, trailing-slash, doubled-slash, %20 and `.html` /meta
 * variants to the canonical lowercase path in a single 301. Unknown slugs
 * return 404 here so they are not redirected and then 404'd (no chains).
 */
import { canonicalizeMetaPath } from '~/utils/metaRoutes'

export default defineEventHandler((event) => {
  const method = event.method || getMethod(event)
  if (method !== 'GET' && method !== 'HEAD') return
  const pathname = getRequestURL(event).pathname || event.path || ''
  const result = canonicalizeMetaPath(pathname)
  if (!result) return
  if (!result.valid) {
    if (pathname === result.canonical) return // let the page 404 for an already-canonical unknown slug
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  if (!result.redirect) return
  const url = getRequestURL(event)
  const target = result.canonical + url.search
  return sendRedirect(event, target, 301)
})
