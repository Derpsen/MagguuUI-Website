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

function buildHtmlCsp(nonce: string, isDev: boolean) {
  // Dev relaxes script-src to 'unsafe-inline' 'unsafe-eval' because Vite HMR
  // and Nuxt devtools inject inline scripts and dynamic-eval modules that can't
  // be nonce-tagged. Production keeps strict nonce + strict-dynamic.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'nonce-${nonce}' 'strict-dynamic'`
  // Dev needs `ws:` for HMR; prod doesn't.
  const connectExtra = isDev ? ' ws: wss:' : ''
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    'frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com',
    `connect-src 'self' https://api.iconify.design https://api.github.com https://pagead2.googlesyndication.com${connectExtra}`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

function injectNonce(fragments: string[], nonce: string) {
  return fragments.map(fragment =>
    fragment.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`),
  )
}

export default defineNitroPlugin((nitroApp) => {
  const isDev = process.env.NODE_ENV === 'development'

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = randomBytes(16).toString('base64')
    event.context.cspNonce = nonce

    if (!isDev) {
      html.head = injectNonce(html.head, nonce)
      html.bodyPrepend = injectNonce(html.bodyPrepend, nonce)
      html.bodyAppend = injectNonce(html.bodyAppend, nonce)
    }

    // Always set the HTML CSP so the locked-down JSON-baseline from
    // routeRules doesn't leak onto HTML responses (which would block all
    // styles and scripts in dev where there's no nonce injection).
    setResponseHeader(event, 'Content-Security-Policy', buildHtmlCsp(nonce, isDev))
  })
})
