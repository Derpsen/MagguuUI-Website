/**
 * Error responses (404 and every other 4xx/5xx) must never be indexed.
 * @nuxtjs/robots stamps every page route with its path rule ("index, follow" for
 * public paths) before the response status is known, so a 404 page would carry it.
 *
 * In production the Nitro error handler sends rendered error pages directly, so
 * `beforeResponse` does not fire for them. The `error` hook
 * does fire first (also for plain 404s) and the handler keeps headers already set
 * on the response, so the header is overridden there. `beforeResponse` stays as a
 * fallback for responses that do reach it.
 */
const NOINDEX = 'noindex, nofollow, noarchive'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const res = event?.node?.res
    if (!res || res.headersSent) return
    const status = (error as unknown as { statusCode?: number }).statusCode ?? 500
    if (status >= 400) res.setHeader('X-Robots-Tag', NOINDEX)
  })

  nitroApp.hooks.hook('beforeResponse', (event) => {
    const res = event.node.res
    if (res.headersSent || res.statusCode < 400) return
    res.setHeader('X-Robots-Tag', NOINDEX)
  })
})
