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

  const expected = useRuntimeConfig().apiBearerToken
  if (!expected) return

  // Same-origin browser request: trust it. The Nuxt frontend would have to
  // ship the token into the client bundle to send it here, so we instead
  // accept the same-origin signal as proof. Server-side rendering does NOT
  // hit this path — those calls are originated by the Nuxt server itself
  // and use the Bearer flow below (see composables/useApiFetch.ts).
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

  // No Origin (server-to-server, curl, GitHub Actions runner, Nuxt SSR
  // internal $fetch) or cross-origin: require Bearer token.
  const auth = getHeader(event, 'authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})
