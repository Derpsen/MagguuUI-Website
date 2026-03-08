/**
 * Security Headers Plugin
 *
 * Removes framework fingerprint headers from all rendered responses.
 */

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    if (!response.headers) return

    delete response.headers['x-powered-by']
    delete response.headers['X-Powered-By']
  })
})
