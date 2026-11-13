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
// The dev server compiles a route on its first visit and Vite may reload the page while it re-optimizes dependencies:
// a reload mid-test throws the scroll position away for reasons that have nothing to do with the router. Visit each
// route once first (CI starts cold).
//
// Flake found on the #201 merge (main CI red, 1 in 6 locally): Back was pressed in the same frames as the forward swap.
// The footer click has already scrolled to 0 by then, so the test could not tell, and (most likely) Nuxt resolves the saved position
// only after `page:loading:end` of the navigation it belongs to, so a Back inside that window lands at 0. The tests now
// wait for the new page to be rendered and the network to be quiet before going Back, as a person would (0 of 30 failed).
test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000)
  const context = await browser.newContext()
  const page = await context.newPage()
  // Same rule as tests/support/warmup.ts: a navigation that Vite aborts or reloads mid-way (net::ERR_ABORTED, a
  // detached frame) is not a failure of the warm-up, only a reason for another round; two clean rounds in a row end it.
  const deadline = Date.now() + 200_000
  let clean = 0
  while (clean < 2) {
    if (Date.now() > deadline) throw new Error('dev-server warm-up did not settle in 200 s')
    let ok = true
    for (const path of ['/guide', '/strings', '/addons', '/meta', '/news']) {
      try {
        await page.goto(path)
        await hydrated(page)
      }
      catch {
        ok = false
      }
    }
    clean = ok ? clean + 1 : 0
  }
  await context.close()
})

const HEADINGS: Record<string, string> = { '/addons': 'Addons', '/strings': 'Import Strings' }
function headingOf(path: string): string {
  const heading = HEADINGS[path]
  if (!heading) throw new Error(`no heading known for ${path}`)
  return heading
}

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
    // Back only once the new page has finished rendering: Nuxt resolves the saved position after `page:loading:end`, and
    // pressing Back within the same frames as the forward swap (the scroll is already 0 by then) is not what a person does.
    await expect(page.locator('h1').first()).toHaveText(headingOf(link))
    await page.waitForLoadState('networkidle')
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${from}$`))
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: `Back restores ${left}`, timeout: 8000 }).toBeGreaterThan(left - 8)
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(left + 8)
  })
}

test('after Back, the next footer click resets the scroll again (the Back mark is consumed)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/guide')
  await hydrated(page)
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }))
  await page.evaluate(() => (document.querySelector('footer a[href="/addons"]') as HTMLElement).click())
  await expect(page).toHaveURL(/\/addons$/)
  await expect(page.locator('h1').first()).toHaveText(headingOf('/addons'))
  await page.waitForLoadState('networkidle')
  await page.goBack()
  await expect(page).toHaveURL(/\/guide$/)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThan(1392)
  await page.evaluate(() => (document.querySelector('footer a[href="/strings"]') as HTMLElement).click())
  await expect(page).toHaveURL(/\/strings$/)
  await expect(page.locator('h1').first()).toHaveText(headingOf('/strings'))
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: 'a footer click after Back starts the new page at the top', timeout: 8000 }).toBe(0)
})

test.describe('/addons separates a failed load from an empty catalog', () => {
  test('API error: "could not be loaded"', async ({ page }) => {
    await page.route('**/api/v1/addons', route => route.abort())
    await page.goto('/guide')
    await hydrated(page)
    await page.evaluate(() => (document.querySelector('footer a[href="/addons"]') as HTMLElement).click())
    await expect(page.getByRole('status').filter({ hasText: 'The addon list could not be loaded.' })).toBeVisible()
    await expect(page.getByText('No addons are listed yet.')).toHaveCount(0)
  })

  test('empty catalog: "No addons are listed yet."', async ({ page }) => {
    await page.route('**/api/v1/addons', route => route.fulfill({ json: { data: { required: [], core: [], optional: [], total: 0 } } }))
    await page.goto('/guide')
    await hydrated(page)
    await page.evaluate(() => (document.querySelector('footer a[href="/addons"]') as HTMLElement).click())
    await expect(page.getByRole('status').filter({ hasText: 'No addons are listed yet.' })).toBeVisible()
    await expect(page.getByText('The addon list could not be loaded.')).toHaveCount(0)
  })
})

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
  await expect(page.locator('h1').first()).toHaveText(headingOf('/strings'))
  await page.waitForLoadState('networkidle')
  await page.goBack()
  await expect(page).toHaveURL(/\/addons$/)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThan(left - 8)
  await page.goForward()
  await expect(page).toHaveURL(/\/strings$/)
  await expect(page.locator('h1').first()).toHaveText(headingOf('/strings'))
  await page.waitForLoadState('networkidle')
  await page.goBack()
  await expect(page).toHaveURL(/\/addons$/)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBeGreaterThan(left - 8)
})
