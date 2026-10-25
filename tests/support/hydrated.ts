import type { Page } from '@playwright/test'

/**
 * Resolves once the page is hydrated (Nuxt has attached its event handlers) and the network is quiet.
 * A cold `nuxt dev` server (CI, fresh browser context) can need well over the 5 s default assertion timeout to
 * hydrate, and a key press or an axe run before that either does nothing or runs into a navigation. Waiting on the
 * actual state is the fix, not a longer sleep.
 */
export async function hydrated(page: Page) {
  await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false, undefined, { timeout: 60_000 })
  await page.waitForLoadState('networkidle')
}
