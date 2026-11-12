/**
 * Which webfont faces a route preloads (plugins/font-preload.ts). `font-display: optional` only uses a face that is in
 * before the first render, so the faces the first screen draws must be preloaded; but a face the page never draws is
 * wasted bytes (the first version preloaded all five everywhere: three of them unused on /admin/login).
 * The table below comes from measuring the faces actually used above the fold (computed font-family and weight of every
 * visible text node at 390 and 1440 px, resolved to the declared weights, ~/web-redesign/fontsused.mjs). Result of
 * the PR 3 measurement: `/`, /guide, /strings, /addons, /meta, /news, /faq, /changelog and /forever all draw sans 400,
 * 600, 700, 800 and mono 400 on the first screen (sans 600 is the nav and small labels, so it belongs in the default;
 * mono 700 only appears below the fold on /strings and /changelog and is deliberately not preloaded); /admin/login draws
 * sans 400 and 600 and mono 400 only. A route not listed gets DEFAULT_FACES.
 */

export type FontFaceId = 'sans-400' | 'sans-600' | 'sans-700' | 'sans-800' | 'mono-400'

export const ALL_FONT_FACES: readonly FontFaceId[] = ['sans-400', 'sans-600', 'sans-700', 'sans-800', 'mono-400']

/** Public pages: body (400), nav and labels (600), buttons (700), display headings (800), kickers and code (mono 400). */
export const DEFAULT_FACES: readonly FontFaceId[] = ['sans-400', 'sans-600', 'sans-700', 'sans-800', 'mono-400']

/** The admin shell never draws the bold or display weights on its first screen (the login page is the measured one). */
export const ADMIN_FACES: readonly FontFaceId[] = ['sans-400', 'sans-600', 'mono-400']

const ROUTE_FACES: ReadonlyArray<{ test: (path: string) => boolean, faces: readonly FontFaceId[] }> = [
  { test: path => path === '/admin' || path.startsWith('/admin/'), faces: ADMIN_FACES },
]

export function fontFacesForPath(path: string): readonly FontFaceId[] {
  const clean = path.split(/[?#]/)[0] || '/'
  return ROUTE_FACES.find(entry => entry.test(clean))?.faces ?? DEFAULT_FACES
}
