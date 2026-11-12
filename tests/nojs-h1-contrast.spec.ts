import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * useIsDark() SSR-emits text-white until mount. Site JavaScript is blocked at
 * the network (inline color-mode may still run; we then force html.light), so
 * Vue never hydrates and the heading keeps the SSR color classes. That is the
 * no-JS / system-light case: without the CSS fallback, the H1 is white-on-white.
 * Axe is injected by Playwright after the class is set, not loaded as a page script.
 */
const paths = ['/guide', '/faq', '/news']

for (const path of paths) {
  test(`${path} H1 stays readable without site JavaScript on a light page`, async ({ page }) => {
    await page.route('**/*', async (route) => {
      const type = route.request().resourceType()
      if (type === 'script' || type === 'xhr' || type === 'fetch') {
        await route.abort()
        return
      }
      await route.continue()
    })

    const response = await page.goto(path, { waitUntil: 'load' })
    expect(response?.status(), path).toBe(200)

    // public-shell uses transition-colors duration-300; disable it so axe
    // does not sample a mid-transition gray background.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' })
    await page.evaluate(() => {
      const html = document.documentElement
      html.classList.remove('dark')
      html.classList.add('light')
    })

    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass, path).toMatch(/\blight\b/)
    expect(htmlClass, path).not.toMatch(/\bdark\b/)

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const color = await h1.evaluate((el) => getComputedStyle(el).color)
    const rgb = (color.match(/\d+/g) || []).map(Number)
    expect(rgb.length, `${path} H1 color ${color}`).toBeGreaterThanOrEqual(3)
    expect(rgb[0]! + rgb[1]! + rgb[2]!, `${path} H1 was not dark enough (${color}) on html.light`).toBeLessThanOrEqual(80)

    const results = await new AxeBuilder({ page }).include('h1').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const contrast = results.violations.filter((v) => v.id === 'color-contrast')
    expect(contrast, `${path}: ${contrast.map((v) => v.nodes.map((n) => n.failureSummary).join('; ')).join(' | ')}`).toEqual([])
  })
}
