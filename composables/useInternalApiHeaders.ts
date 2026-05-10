/**
 * Returns Authorization headers for internal SSR fetches against the
 * bearer-guarded public endpoints (/api/v1/profiles, /api/v1/wowup,
 * /api/v1/layouts/*). On the client we return undefined — same-origin
 * browser requests bypass the bearer check, and the token is server-only
 * (never shipped to the client bundle).
 *
 * Use this in any `useFetch` against the guarded endpoints:
 *
 *   const { data } = await useFetch('/api/v1/profiles', {
 *     headers: useInternalApiHeaders(),
 *   })
 */
export function useInternalApiHeaders(): Record<string, string> | undefined {
  if (!import.meta.server) return undefined
  const config = useRuntimeConfig()
  const token = config.apiBearerToken
  if (!token) return undefined
  return { Authorization: `Bearer ${token}` }
}
