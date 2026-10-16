/**
 * HTML Content-Security-Policy builder (used by server/plugins/csp-nonce.ts).
 *
 * `upgrade-insecure-requests` is only emitted when the request reached us over
 * HTTPS (directly or via the Cloudflare tunnel's X-Forwarded-Proto). On plain
 * HTTP LAN access (e.g. http://192.168.178.21:3000) the directive makes the
 * browser rewrite every `/_nuxt/*.css|js` to https://, which fails without TLS
 * and leaves the page with no styles and no hydration.
 */
export interface HtmlCspOptions {
  isDev: boolean
  upgradeInsecure: boolean
}

export function buildHtmlCsp(nonce: string | null, { isDev, upgradeInsecure }: HtmlCspOptions) {
  // Dev relaxes script-src to 'unsafe-inline' 'unsafe-eval' because Vite HMR
  // and Nuxt devtools inject inline scripts and dynamic-eval modules that can't
  // be nonce-tagged. Production keeps strict nonce + strict-dynamic.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : nonce
      ? `'nonce-${nonce}' 'strict-dynamic' 'self'`
      // 'strict-dynamic' without a nonce would block same-origin scripts too.
      : "'self'"
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
    ...(!isDev && upgradeInsecure ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

/** Locked-down policy for JSON/API and other non-document responses. */
export const BASELINE_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

export function isHtmlContentType(contentType: unknown) {
  return typeof contentType === 'string' && contentType.toLowerCase().includes('text/html')
}

/** First script nonce in a rendered document, if any. */
export function nonceFromHtml(body: unknown): string | null {
  if (typeof body !== 'string') return null
  const match = body.match(/<script[^>]*\snonce="([A-Za-z0-9+/=]+)"/i)
  return match?.[1] ?? null
}

/**
 * CSP for the outgoing response. SWR-cached HTML (routeRules `swr`) skips
 * `render:html`, so the document keeps the nonce baked in at render time and
 * we rebuild the policy from it. Non-HTML responses get the baseline, but only
 * when nothing else set a policy, so assets never get a document CSP that
 * blocks them and documents never get the baseline.
 */
export function resolveResponseCsp(input: {
  contentType: unknown
  body: unknown
  current: unknown
  isDev: boolean
  upgradeInsecure: boolean
}): string | null {
  const current = typeof input.current === 'string' ? input.current : ''
  if (isHtmlContentType(input.contentType)) {
    const nonce = nonceFromHtml(input.body)
    if (nonce) return buildHtmlCsp(nonce, input)
    if (current.includes('script-src')) return null
    // No nonce found (dev, or a document without scripts): still a document policy.
    return buildHtmlCsp(null, input)
  }
  return current ? null : BASELINE_CSP
}

/**
 * Whether response headers can still be written. `beforeResponse` also runs
 * for handlers that already flushed the response themselves (streams, aborted
 * requests, redirects/304s written by other middleware); writing then throws
 * ERR_HTTP_HEADERS_SENT.
 */
export function canWriteHeaders(event: { handled?: boolean, node?: { res?: { headersSent?: boolean, writableEnded?: boolean } } }): boolean {
  const res = event.node?.res
  if (!res) return true
  return !res.headersSent && !res.writableEnded
}
