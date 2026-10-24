/**
 * Error responses (404 and every other 4xx/5xx) must never be indexed.
 * @nuxtjs/robots stamps every page route with its path rule ("index, follow" for
 * public paths) before the response status is known, so a 404 page would carry it.
 * `beforeResponse` runs once the status is final, for rendered and thrown errors.
 */
const NOINDEX = 'noindex, nofollow, noarchive'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const res = event.node.res
    if (res.headersSent || res.statusCode < 400) return
    res.setHeader('X-Robots-Tag', NOINDEX)
  })
})
