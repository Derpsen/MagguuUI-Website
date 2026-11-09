/**
 * The site covers MagguuUI for Retail and MagguuUI on Forever (Camelot flavor
 * in the same package since v12.1.9). The header shows the nav of the product
 * the current page belongs to. Pure, so the layout and the unit tests share one source.
 */

export type Product = 'retail' | 'forever'

export interface NavLink { to: string, label: string }

export const FOREVER_BASE = '/forever'

export const RETAIL_NAV: readonly NavLink[] = [
  { to: '/', label: 'Home' },
  { to: '/strings', label: 'Import Strings' },
  { to: '/addons', label: 'Addons' },
  { to: '/guide', label: 'Guides' },
  { to: '/changelog', label: 'Changelog' },
  { to: '/faq', label: 'FAQ' },
]

export const FOREVER_NAV: readonly NavLink[] = [
  { to: '/forever', label: 'Overview' },
  { to: '/forever/guide', label: 'Guide' },
  { to: '/forever/download', label: 'Download' },
  { to: '/forever/strings', label: 'Strings' },
]

export const PRODUCT_SWITCH: readonly { product: Product, label: string, to: string }[] = [
  { product: 'retail', label: 'Retail', to: '/' },
  { product: 'forever', label: 'Forever', to: FOREVER_BASE },
]

export function productForPath(path: string): Product {
  return path === FOREVER_BASE || path.startsWith(`${FOREVER_BASE}/`) ? 'forever' : 'retail'
}

export function navLinksFor(product: Product): readonly NavLink[] {
  return product === 'forever' ? FOREVER_NAV : RETAIL_NAV
}

/** Header CTA. Forever has none: Download is already in its nav, a second link would only repeat it. */
export function primaryActionFor(product: Product): NavLink | null {
  return product === 'forever' ? null : { to: '/guide', label: 'Download' }
}

/** Section roots ('/' and '/forever') match only themselves; other links also match their subpages. */
export function isNavActive(currentPath: string, to: string): boolean {
  if (to === '/' || to === FOREVER_BASE) return currentPath === to
  return currentPath === to || currentPath.startsWith(`${to}/`)
}
