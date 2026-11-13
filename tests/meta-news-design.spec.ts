import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Redesign PR 4: /meta, a spec page, /news and an article. Real boxes at 320/360/390 (overflow-x: clip hides overflow
 * from scrollWidth), axe in both themes, and no heading/lead movement while the late woff2 files arrive.
 */
const PAGES = [
  { path: '/meta', ready: 'nav[aria-label] ul' },
  { path: '/meta/mage/fire', ready: '#overview' },
  { path: '/news', ready: 'ul.divide-y' },
  { path: '/news/midnight-season-2-mythic-plus-pool', ready: '.news-body' },
]

for (const { path, ready } of PAGES) {
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 360, 390]) {
      test(`${path} (${theme}): no element is wider than the ${width}px viewport`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 800 } })
        await context.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), theme)
        const page = await context.newPage()
        await page.goto(path)
        await hydrated(page)
        await expect(page.locator(ready).first()).toBeVisible()
        const offenders = await page.evaluate((vw) => {
          const out: string[] = []
          for (const el of Array.from(document.querySelectorAll('main *'))) {
            const r = el.getBoundingClientRect()
            if (r.width === 0 && r.height === 0) continue
            if (r.width <= 1 && r.height <= 1) continue // sr-only
            // A scroll container (table, pre) may be wider inside; it must not widen the page itself.
            if (r.right > vw + 0.5 || r.left < -0.5) {
              const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.')
              out.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} ${Math.round(r.left)}..${Math.round(r.right)}`)
            }
          }
          return out.slice(0, 8)
        }, width)
        expect(offenders, `elements outside ${width}px`).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
        await context.close()
      })
    }

    test(`${path} (${theme}): axe finds no WCAG 2.x A/AA violation`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 800 } })
      await context.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), theme)
      const page = await context.newPage()
      await page.goto(path)
      await hydrated(page)
      await expect(page.locator(ready).first()).toBeVisible()
      await expect(page.locator('html')).toHaveClass(new RegExp(theme))
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
      await context.close()
    })
  }
}

test('the news article body takes its colours from the tokens in both themes', async ({ browser }) => {
  const seen: Record<string, string[]> = {}
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } })
    await context.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), theme)
    const page = await context.newPage()
    await page.goto('/news/midnight-season-2-mythic-plus-pool')
    await hydrated(page)
    seen[theme] = await page.evaluate(() => {
      const body = document.querySelector('.news-body')!
      const colour = (el: Element | null) => (el ? getComputedStyle(el).color : 'missing')
      return [colour(body), colour(body.querySelector('h2, h3')), colour(body.querySelector('a'))]
    })
    expect(seen[theme]).not.toContain('missing')
    await context.close()
  }
  // Light text on the dark page, dark text on the light one: the body is no longer pinned to a dark-only palette.
  const lum = (rgb: string) => {
    const [r = 0, g = 0, b = 0] = (rgb.match(/\d+/g) ?? []).map(Number)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  expect(lum(seen.dark![1]!)).toBeGreaterThan(180)
  expect(lum(seen.light![1]!)).toBeLessThan(60)
  expect(lum(seen.light![0]!)).toBeLessThan(140)
})

test('the news index and /meta headings do not move when the late woff2 files arrive (320px)', async ({ browser }) => {
  for (const path of ['/news', '/meta']) {
    const context = await browser.newContext({ viewport: { width: 320, height: 800 } })
    const page = await context.newPage()
    await page.route(/\.woff2$/, async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      await route.continue()
    })
    await page.goto(path)
    const box = async () => page.locator('h1').first().boundingBox()
    const first = await box()
    await page.waitForTimeout(2500)
    const second = await box()
    expect(second?.y, path).toBeCloseTo(first!.y, 0)
    expect(second?.height, path).toBeCloseTo(first!.height, 0)
    await context.close()
  }
})
