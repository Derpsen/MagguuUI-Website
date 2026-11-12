/**
 * Mobile menu helpers (layouts/default.vue). Plain functions with injected deps so the contract is unit-testable:
 * the scroll lock sits on <html>, focus goes back to the hamburger, and the menu closes when the viewport grows
 * past the hamburger breakpoint (otherwise `aria-expanded` and the scroll lock outlive the hidden menu).
 */

export const MENU_SCROLL_LOCK_CLASS = 'mg-scroll-lock'

/** Tailwind `xl`: from here the header shows the full navigation and the hamburger is hidden. */
export const MENU_DESKTOP_QUERY = '(min-width: 1280px)'

export function setScrollLock(root: { classList: { toggle(name: string, force?: boolean): boolean } }, locked: boolean): void {
  root.classList.toggle(MENU_SCROLL_LOCK_CLASS, locked)
}

export function focusElement(target: { focus(): void } | null | undefined): void {
  target?.focus()
}

export interface MenuMediaQuery {
  matches: boolean
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void
}

/** Calls `onDesktop` whenever the viewport crosses into the desktop layout; returns the cleanup. */
export function onMenuBreakpoint(
  matchMedia: (query: string) => MenuMediaQuery,
  onDesktop: () => void,
): () => void {
  const query = matchMedia(MENU_DESKTOP_QUERY)
  const listener = (event: { matches: boolean }) => {
    if (event.matches) onDesktop()
  }
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
