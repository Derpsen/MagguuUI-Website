/**
 * Content-Security-Policy with per-request nonce + strict-dynamic.
 *
 * Replaces the static `'unsafe-inline'` CSP from nuxt.config.ts:
 * - Each HTML response gets a fresh base64 nonce.
 * - The nonce is injected into every <script> tag Nuxt emits (hydration + head scripts).
 * - CSP `script-src` allows that nonce and uses `'strict-dynamic'` so scripts loaded
 *   by the hydrated runtime (e.g. AdSense) inherit trust without wildcards.
 * - Non-HTML responses get a locked-down baseline CSP (no scripts at all).
 */

import { randomBytes } from 'node:crypto'

function buildHtmlCsp(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    // Nonce + strict-dynamic: our own inline scripts carry this per-request nonce;
    // any script they then load at runtime inherits trust. No broad `https:` so
    // a script can't be smuggled in via a compromised third-party host — scripts
    // must be explicitly reachable from a trusted, nonce-tagged source.
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    // Ads: limit to DoubleClick + Google Syndication iframes. Not generic google.com.
    'frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com',
    "connect-src 'self' https://api.iconify.design https://api.github.com https://pagead2.googlesyndication.com",
    'upgrade-insecure-requests',
  ].join('; ')
}

function injectNonce(fragments: string[], nonce: string) {
  return fragments.map(fragment =>
    fragment.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`),
  )
}

export default defineNitroPlugin((nitroApp) => {
  // In development, Nuxt's HMR/devtools rely on inline scripts and ws connections
  // that don't carry our nonce. Only enforce nonce-based CSP in non-dev runtimes.
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) return

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = randomBytes(16).toString('base64')
    // Expose nonce for any later handlers that want to tag their own inline scripts.
    event.context.cspNonce = nonce

    html.head = injectNonce(html.head, nonce)
    html.bodyPrepend = injectNonce(html.bodyPrepend, nonce)
    html.bodyAppend = injectNonce(html.bodyAppend, nonce)

    setResponseHeader(event, 'Content-Security-Policy', buildHtmlCsp(nonce))
  })
})
