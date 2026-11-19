import { expect, test, type Page } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Cross-page and first-load hashes must land on the target, not at the top
 * (Code-Review #211: scrollBehavior used to return { left: 0, top: 0 } for
 * START_LOCATION and for a push to another page).
 */
async function expectHashLanded(page: Page, id: string) {
  await expect.poll(async () => page.evaluate((targetId) => {
    const el = document.getElementById(targetId)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    const header = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
    const expected = margin + header
    return rect.top >= expected - 16 && rect.top <= expected + 80 ? Math.round(window.scrollY) : null
  }, id), { message: `#${id} is near the top of the viewport`, timeout: 8000 }).not.toBeNull()
}

test('a direct load of /changelog#release-v0-9-1 lands on that release', async ({ page }) => {
  await page.goto('/changelog#release-v0-9-1')
  await hydrated(page)
  await expect(page.locator('article#release-v0-9-1')).toBeVisible()
  await expectHashLanded(page, 'release-v0-9-1')
})

test('a direct load of /guide#step-3 lands on that step', async ({ page }) => {
  await page.goto('/guide#step-3')
  await hydrated(page)
  await expect(page.locator('#step-3')).toBeVisible()
  await expectHashLanded(page, 'step-3')
})

test('a click from /faq "get in touch" lands on /about#contact', async ({ page }) => {
  await page.goto('/faq')
  await hydrated(page)
  await page.getByRole('link', { name: 'get in touch' }).click()
  await expect(page).toHaveURL(/\/about#contact$/)
  await expect(page.locator('#contact')).toBeVisible()
  await expectHashLanded(page, 'contact')
})
