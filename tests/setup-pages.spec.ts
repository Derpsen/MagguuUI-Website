import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/** Redesign PR 3: Guide, Strings and Addons. Real boxes (overflow-x: clip hides overflow from scrollWidth) and the late-font swap. */
const PAGES = [
  { path: '/guide', ready: 'ol.guide-steps' },
  { path: '/strings', ready: '[role="tablist"]' },
  { path: '/addons', ready: '.addon-list' },
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
  }
}

/** The woff2 files arrive late (font-display: optional keeps the metric-matched fallback): the head must not move. */
for (const { path } of PAGES) {
  test(`${path}: late webfonts do not move the heading or the lead at 320px`, async ({ browser }) => {
    for (let run = 0; run < 2; run++) {
      const context = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' })
      const page = await context.newPage()
      await page.route('**/*.woff2*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1500))
        await route.continue()
      })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h1')).toBeVisible()
      await page.waitForFunction(() => { const el = document.querySelector('h1'); return !!el && getComputedStyle(el).fontWeight === '800' })
      const probe = () => page.evaluate(() => {
        const h1 = document.querySelector('h1')!.getBoundingClientRect()
        const lead = document.querySelector('.setup-head__lead')!.getBoundingClientRect()
        return { h1Height: Math.round(h1.height), leadHeight: Math.round(lead.height), h1ToLead: Math.round(lead.top - h1.top) }
      })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const first = await probe()
      await hydrated(page)
      await page.waitForTimeout(2500)
      const settled = await probe()
      for (const key of Object.keys(first) as Array<keyof typeof first>) {
        expect(Math.abs(settled[key] - first[key]), `${path} run ${run}: ${key} moved (${first[key]} -> ${settled[key]})`).toBeLessThanOrEqual(1)
      }
      await context.close()
    }
  })
}

test('the font preload set follows the route: public pages preload five faces, the admin login three', async ({ page }) => {
  const preloads = async (path: string) => {
    await page.goto(path)
    return page.evaluate(() => Array.from(document.querySelectorAll('link[rel="preload"][as="font"]')).map(l => (l as HTMLLinkElement).href))
  }
  expect(await preloads('/guide')).toHaveLength(5)
  expect(await preloads('/addons')).toHaveLength(5)
  expect(await preloads('/admin/login')).toHaveLength(3)
})
