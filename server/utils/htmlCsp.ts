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

export function buildHtmlCsp(nonce: string, { isDev, upgradeInsecure }: HtmlCspOptions) {
  // Dev relaxes script-src to 'unsafe-inline' 'unsafe-eval' because Vite HMR
  // and Nuxt devtools inject inline scripts and dynamic-eval modules that can't
  // be nonce-tagged. Production keeps strict nonce + strict-dynamic.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'nonce-${nonce}' 'strict-dynamic' 'self'`
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
