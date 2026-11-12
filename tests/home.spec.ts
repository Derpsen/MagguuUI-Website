import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/** Home (redesign PR 2): the hero names the three ways in (Install & Setup, Import Strings, downloads) and the steps. */
test('hero: one H1, Install & Setup, Import Strings, three steps, Apply Magguu profiles', async ({ page }) => {
  await page.goto('/')
  const hero = page.locator('section[aria-label="Hero"]')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toContainText('MagguuUI')
  await expect(hero.getByRole('link', { name: 'Install & Setup' })).toHaveAttribute('href', '/guide')
  await expect(hero.getByRole('link', { name: 'Import Strings' })).toHaveAttribute('href', '/strings')
  await expect(page.getByTestId('home-hero-steps').locator('li')).toHaveCount(3)
  await expect(hero).toContainText('Apply Magguu profiles')
})

test('home works without JavaScript on a narrow screen and has no horizontal scroll', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } })
  const page = await context.newPage()
  await page.goto('http://localhost:3000/')
  await expect(page.locator('h1')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await context.close()
})

/**
 * `.home { overflow-x: clip }` keeps scrollWidth == clientWidth, so the check above cannot see content that is merely
 * clipped. Look at the real boxes instead: no element may extend past the viewport (or start left of it).
 */
for (const width of [320, 360, 390]) {
  test(`home: no element is wider than the ${width}px viewport (clipped overflow counts)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 } })
    const page = await context.newPage()
    await page.goto('/')
    await hydrated(page)
    await expect(page.getByTestId('home-addon-list')).toBeVisible()
    const offenders = await page.evaluate((vw) => {
      const out: string[] = []
      for (const el of Array.from(document.querySelectorAll('main *, .home *'))) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (r.width <= 1 && r.height <= 1) continue // sr-only text (1px, clipped)
        // Decorative layers that are meant to bleed (aurora, glows) are pseudo-elements, not elements, so everything here is real content.
        if (r.right > vw + 0.5 || r.left < -0.5) {
          const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.')
          out.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} ${Math.round(r.left)}..${Math.round(r.right)}`)
        }
      }
      return out.slice(0, 8)
    }, width)
    expect(offenders, `elements outside ${width}px`).toEqual([])
    await context.close()
  })
}

/**
 * The font swap used to rewrap the hero at 320px (CLS 0.06-0.36). The dev server's own CSS injection makes a raw CLS
 * number meaningless here (the production build measures 0.0000, see AGENTS.md), so this test isolates the font effect:
 * the woff2 files arrive late, and the hero boxes must not move between the first frame and the settled page.
 */
test('home: late webfonts do not move the hero at 320px (font-display optional + metric-matched fallback)', async ({ browser }) => {
  for (let run = 0; run < 3; run++) {
    // reducedMotion: the hero rises in with a transform, which getBoundingClientRect would report as a move.
    const context = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.route('**/*.woff2*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      await route.continue()
    })
    // Not 'load': preloaded fonts delay it, which would hide exactly the late swap this test is about.
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toBeVisible()
    // The dev server injects component CSS with JS: wait until the hero styles are in, so only the font can still move things.
    await page.waitForFunction(() => { const el = document.querySelector('.home-hero__name'); return !!el && getComputedStyle(el).fontWeight === '800' })
    const probe = () => page.evaluate(() => {
      const box = (sel: string) => {
        const r = document.querySelector(sel)?.getBoundingClientRect()
        return r ? { top: Math.round(r.top + scrollY), height: Math.round(r.height) } : null
      }
      const h1 = box('h1')!
      const sub = box('.home-hero__sub')!
      const cta = box('[data-cta="hero-setup"]')!
      // Relative geometry: anything above the hero (banners, header) may legitimately arrive later; the font must not.
      return { h1Height: h1.height, subHeight: sub.height, h1ToSub: sub.top - h1.top, subToCta: cta.top - sub.top }
    })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const first = await probe()
    await hydrated(page)
    await page.waitForTimeout(2500)
    const settled = await probe()
    for (const key of Object.keys(first) as Array<keyof typeof first>) {
      expect(Math.abs(settled[key] - first[key]), `run ${run}: ${key} moved (${first[key]} -> ${settled[key]})`).toBeLessThanOrEqual(1)
    }
    await context.close()
  }
})

test('home: reduced motion switches every home animation off', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await hydrated(page)
  const names = await page.evaluate(() => {
    const pick = (sel: string, pseudo?: string) => {
      const el = document.querySelector(sel)
      return el ? getComputedStyle(el, pseudo).animationName : 'missing'
    }
    return [pick('.home-hero-wrap', '::before'), pick('.home-rise'), pick('.home-shot__frame')]
  })
  expect(names).toEqual(['none', 'none', 'none'])
  await context.close()
})
