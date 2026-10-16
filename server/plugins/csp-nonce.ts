/**
 * Content-Security-Policy with per-request nonce + strict-dynamic.
 *
 * Replaces the static `'unsafe-inline'` CSP from nuxt.config.ts:
 * - Each HTML response gets a fresh base64 nonce.
 * - The nonce is injected into every <script> tag Nuxt emits (hydration + head scripts).
 * - CSP `script-src` allows that nonce and uses `'strict-dynamic'` so scripts loaded
 *   by the hydrated runtime (e.g. AdSense) inherit trust without wildcards.
 * - Non-HTML responses get a locked-down baseline CSP (no scripts at all).
 *
 * SWR-cached pages (`routeRules` `swr`) are served from cache without running
 * `render:html`, so the header set there never reached the client and the
 * routeRules baseline (`default-src 'none'`) blocked all CSS/JS on bare `/`.
 * The `beforeResponse` hook below runs for every response, rebuilds the HTML
 * policy from the nonce baked into the (cached) document, and gives non-HTML
 * responses the baseline only when nothing else set one.
 *
 * SPA shells (`routeRules` `ssr: false`, e.g. `/admin/**`) place
 * `window.__NUXT_SITE_CONFIG__` in `html.body`. Skipping that fragment left the
 * inline script without a nonce, so production CSP blocked it on hard reload of
 * `/admin/login` and the client fell into the 500 error page.
 */

import { randomBytes } from 'node:crypto'
import { buildHtmlCsp, canWriteHeaders, resolveResponseCsp } from '../utils/htmlCsp'

function injectNonce(fragments: string[] | undefined, nonce: string) {
  return (fragments || []).map(fragment =>
    fragment.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`),
  )
}

export default defineNitroPlugin((nitroApp) => {
  const isDev = process.env.NODE_ENV === 'development'

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    try {
      const nonce = randomBytes(16).toString('base64')
      event.context.cspNonce = nonce

      if (!isDev) {
        html.head = injectNonce(html.head, nonce)
        html.bodyPrepend = injectNonce(html.bodyPrepend, nonce)
        // SPA shells put site-config / payload scripts here — must be nonced too.
        html.body = injectNonce(html.body, nonce)
        html.bodyAppend = injectNonce(html.bodyAppend, nonce)
      }

      // Always set the HTML CSP so the locked-down JSON-baseline from
      // routeRules doesn't leak onto HTML responses (which would block all
      // styles and scripts in dev where there's no nonce injection).
      // upgrade-insecure-requests only over HTTPS (Cloudflare tunnel sets X-Forwarded-Proto);
      // plain-HTTP LAN access would otherwise lose all /_nuxt CSS/JS.
      const upgradeInsecure = getRequestProtocol(event, { xForwardedProto: true }) === 'https'
      if (!canWriteHeaders(event)) return
      setResponseHeader(event, 'Content-Security-Policy', buildHtmlCsp(nonce, { isDev, upgradeInsecure }))
    }
    catch (error) {
      // Never let a CSP plugin failure turn a valid HTML response into a 500.
      console.error('[csp-nonce] failed to apply nonce/CSP', error)
    }
  })

  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    // Responses already flushed by their handler (streams, aborted requests,
    // redirects) can't take headers anymore: ERR_HTTP_HEADERS_SENT.
    if (!canWriteHeaders(event)) return
    try {
      const csp = resolveResponseCsp({
        contentType: getResponseHeader(event, 'Content-Type'),
        body: response?.body,
        current: getResponseHeader(event, 'Content-Security-Policy'),
        isDev,
        upgradeInsecure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
      })
      if (csp) setResponseHeader(event, 'Content-Security-Policy', csp)
    }
    catch (error) {
      console.error('[csp-nonce] failed to finalize CSP', error)
    }
  })
})
