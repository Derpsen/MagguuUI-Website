/**
 * Server Middleware - Public-API Bearer Guard
 *
 * Gates the read-only sync endpoints consumed by the MagguuUI repo's
 * `update-profiles.yml` GitHub Action against a shared bearer token. The
 * token is provisioned via the API_BEARER_TOKEN env var (set on the host;
 * mirrored as the WEBSITE_API_KEY repo secret on the workflow side).
 *
 * Same-origin browser requests from the website itself bypass the check —
 * the Nuxt frontend fetches the same endpoints and we don't want to ship
 * the token into client-side JS. Server-to-server callers either omit
 * Origin entirely (curl, fetch from GitHub runner) or send a foreign one;
 * both paths require the bearer.
 *
 * If API_BEARER_TOKEN is unset, the middleware no-ops so a missing
 * deployment env var degrades to legacy unauthenticated behaviour rather
 * than locking the site out of its own data.
 */

const GUARDED_PREFIXES = [
  '/api/v1/profiles',
  '/api/v1/wowup',
  '/api/v1/layouts',
] as const

function isGuarded(path: string): boolean {
  for (const prefix of GUARDED_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true
  }
  return false
}

export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (!isGuarded(pathname)) return

  const expected = process.env.API_BEARER_TOKEN
  if (!expected) return

  // Same-origin browser request: trust it, the user already loaded the
  // site over HTTPS from this host.
  const origin = getHeader(event, 'origin')
  if (origin) {
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch {
      throw createError({ statusCode: 403, message: 'Invalid Origin header' })
    }
    if (originHost === getRequestHost(event)) return
  }

  // Cross-origin or no Origin: require Bearer token.
  const auth = getHeader(event, 'authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})
