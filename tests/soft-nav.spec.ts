import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Soft-navigation CLS to /addons (pre-existing, found after redesign PR 3). Two causes, both needed to reach 0:
 *  1. pages/addons.vue did not await its useFetch, so the page swapped in with an empty list and the footer, already
 *     on screen, jumped down when the data landed;
 *  2. the router scrolled to the top only AFTER the new page rendered (smooth, because of `* { scroll-behavior: smooth }`),
 *     so a footer-link click swapped the page in under a footer-sized viewport.
 * The click is simulated with `element.click()` (not a user input), so no shift is excused by the 500 ms input window.
 */
for (const from of ['/guide', '/news', '/meta']) {
  test(`navigating from ${from} to /addons through the footer link moves nothing`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto(from)
    await hydrated(page)
    const link = page.locator('footer a[href="/addons"]').first()
    await link.scrollIntoViewIfNeeded()
    await page.evaluate(() => {
      const w = window as unknown as { __shift: number, __swap: { rows: number, scrollY: number } | null }
      w.__shift = 0
      w.__swap = null
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number }>) w.__shift += entry.value
      }).observe({ type: 'layout-shift' })
      // First frame in which the /addons heading exists: the list must already be there and the scroll already reset.
      new MutationObserver(() => {
        if (w.__swap || !location.pathname.startsWith('/addons')) return
        const h1 = document.querySelector('h1')
        if (h1?.textContent?.trim() !== 'Addons') return
        w.__swap = { rows: document.querySelectorAll('.addon-row, .addon-required').length, scrollY: Math.round(window.scrollY) }
      }).observe(document.body, { childList: true, subtree: true })
    })
    await page.evaluate(() => (document.querySelector('footer a[href="/addons"]') as HTMLElement).click())
    await expect(page.locator('.addon-list').first()).toBeVisible()
    await page.waitForTimeout(1500)
    const result = await page.evaluate(() => {
      const w = window as unknown as { __shift: number, __swap: { rows: number, scrollY: number } | null }
      return { shift: w.__shift, swap: w.__swap }
    })
    expect(result.swap, 'the heading was never seen').not.toBeNull()
    expect(result.swap!.rows, 'the addon list is empty when the page first appears').toBeGreaterThan(0)
    expect(result.swap!.scrollY, 'the new page appears at the old scroll offset').toBe(0)
    expect(result.shift, 'layout shift during the navigation').toBeLessThan(0.001)
  })
}

/**
 * Back/Forward must restore the leaving page's scroll position (Code-Review #201: the first version of the scroll reset
 * ran before vue-router saved it, so Back landed at 0). Real clicks, real history.
 */
const BACK_PAIRS = [
  { from: '/guide', link: '/addons' },
  { from: '/news', link: '/addons' },
  { from: '/guide', link: '/strings' },
  { from: '/meta', link: '/addons' },
]

for (const { from, link } of BACK_PAIRS) {
  test(`Back from ${link} to ${from} restores the scroll position (footer link at 1400px), and the new page starts at the top`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto(from)
    await hydrated(page)
    // 1400 px down (the position from the Code-Review A/B), then the footer link is activated without scrolling to it:
    // the full-height guide page restores only what its first layout allows, so a footer-high offset is not comparable.
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }))
    const left = await page.evaluate(() => Math.round(window.scrollY))
    expect(left).toBeGreaterThan(1000)
    await page.evaluate(href => (document.querySelector(`footer a[href="${href}"]`) as HTMLElement).click(), link)
    await expect(page).toHaveURL(new RegExp(`${link}$`))
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: 'new page starts at the top' }).toBe(0)
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${from}$`))
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: `Back restores ${left}`, timeout: 8000 }).toBeGreaterThan(left - 8)
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(left + 8)
  })
}

test('Forward restores the position of the page left by a footer click', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/addons')
  await hydrated(page)
  const footerLink = page.locator('footer a[href="/strings"]').first()
  await footerLink.scrollIntoViewIfNeeded()
  const left = await page.evaluate(() => Math.round(window.scrollY))
  expect(left).toBeGreaterThan(300)
  await footerLink.click()
  await expect(page).toHaveURL(/\/strings$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/addons$/)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThan(left - 8)
  await page.goForward()
  await expect(page).toHaveURL(/\/strings$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/addons$/)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThan(left - 8)
})
