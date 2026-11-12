import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

const TRADEMARK = /\b(?:WoW|World of Warcraft|Warcraft)\b/i

declare global {
  interface Window {
    __metaCls?: number
  }
}

async function visit(path: string, theme: 'light' | 'dark', page: import('@playwright/test').Page, options: { measureCls?: boolean } = {}) {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  if (options.measureCls) {
    await page.addInitScript(() => {
      window.__metaCls = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean, value?: number }
          if (!shift.hadRecentInput) window.__metaCls = (window.__metaCls || 0) + (shift.value || 0)
        }
      })
      observer.observe({ type: 'layout-shift', buffered: true })
    })
  }
  await page.addInitScript(t => localStorage.setItem('nuxt-color-mode', t), theme)
  const response = await page.goto(path)
  await hydrated(page)
  return { response, problems }
}

async function waitForImages(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => (
      img.complete ? undefined : new Promise<void>((resolve) => { img.addEventListener('load', () => resolve(), { once: true }); img.addEventListener('error', () => resolve(), { once: true }) })
    )))
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
}


async function assertUnclippedOpenTooltip(page: import('@playwright/test').Page, trigger: import('@playwright/test').Locator) {
  await trigger.scrollIntoViewIfNeeded()
  await expect(trigger).toBeVisible()
  // Re-focus must blur first: a leftover focus (e.g. previous viewport) makes
  // locator.focus() a no-op, so @focus never fires and the panel stays closed.
  await trigger.evaluate((el) => (el as HTMLElement).blur())
  await trigger.focus()
  const tipId = await trigger.getAttribute('aria-describedby')
  expect(tipId).toBeTruthy()
  const tip = page.locator(`[id="${tipId}"]`)
  await expect(tip).toBeVisible()
  const clip = await tip.evaluate((el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) return 'empty-box'
    let parent = el.parentElement
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent)
      const hidden = [style.overflow, style.overflowX, style.overflowY].some((value) => value === 'hidden' || value === 'clip')
      if (hidden) {
        const box = parent.getBoundingClientRect()
        if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) {
          return parent.className || parent.tagName
        }
      }
      parent = parent.parentElement
    }
    return ''
  })
  expect(clip, `tooltip panel clipped by overflow: ${clip}`).toBe('')
  const ring = await trigger.evaluate((el) => {
    const style = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    let clipped = false
    let parent = el.parentElement
    while (parent && parent !== document.body) {
      const overflow = getComputedStyle(parent)
      if (/(hidden|clip)/.test(`${overflow.overflow}${overflow.overflowX}${overflow.overflowY}`)) {
        const box = parent.getBoundingClientRect()
        if (r.top - 4 < box.top || r.bottom + 4 > box.bottom || r.left - 4 < box.left || r.right + 4 > box.right) clipped = true
      }
      parent = parent.parentElement
    }
    return { shadow: style.boxShadow, outline: style.outline, clipped }
  })
  expect(ring.shadow === 'none' && (ring.outline === 'none' || ring.outline === 'rgb(0, 0, 0) none 0px'), 'expected a visible focus ring').toBe(false)
  expect(ring.clipped, 'focus ring clipped by overflow').toBe(false)
  return tip
}

async function readCls(page: import('@playwright/test').Page) {
  await waitForImages(page)
  return page.evaluate(() => window.__metaCls ?? 0)
}

test('/meta shows the fixture snapshot, methodology and attribution in light and dark, without trademarks or third-party scripts', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    const { response, problems } = await visit('/meta', theme, page)
    expect(response?.status(), theme).toBe(200)
    await expect(page.locator('h1')).toHaveText('Mythic+ Meta')
    await expect(page.locator('html')).toHaveClass(new RegExp(theme))
    await expect(page.getByRole('status').filter({ hasText: 'Collecting data.' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Fire' })).toBeVisible()
    await expect(page.getByText('low sample', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Data provided by Blizzard')).toBeVisible()
    await expect(page.getByText('Not affiliated with or endorsed by Blizzard Entertainment.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Methodology' })).toBeVisible()
    await expect(page.getByText('Low popularity ≠ unplayable.', { exact: true })).toBeVisible()
    const title = await page.title()
    expect(title).not.toMatch(TRADEMARK)
    expect(page.url()).not.toMatch(TRADEMARK)
    expect(await page.locator('script[src*="wowhead"], script[src*="icy-veins"], script[src*="murlok"], script[src*="archon"], script[src*="adsbygoogle"], script[src*="googlesyndication"]').count()).toBe(0)
    expect(await page.locator('a[href*="wowhead"]').count()).toBe(0)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([])
    expect(problems, theme).toEqual([])
  }
})

test('/meta/mage/fire is a filled fixture spec page with CLS under 0.1, and empty/unknown slugs stay 404 or collecting', async ({ page }) => {
  const fire = await visit('/meta/mage/fire', 'light', page, { measureCls: true })
  expect(fire.response?.status()).toBe(200)
  await expect(page.locator('h1')).toHaveText('Fire Mage – Mythic+ Builds')
  await expect(page.getByRole('heading', { name: 'Best build' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Collecting data.' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'murlok.io' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Archon' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Icy Veins' })).toBeVisible()
  const title = await page.title()
  expect(title).not.toMatch(TRADEMARK)
  const cls = await readCls(page)
  console.log(`CLS /meta/mage/fire=${cls}`)
  expect(cls, `CLS on /meta/mage/fire was ${cls}`).toBeLessThan(0.1)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(axe.violations.map(v => v.id)).toEqual([])
  expect(await page.locator('a[href*="wowhead"]').count()).toBe(0)
  // Heatmap/tooltips are SSR'd but hydrate only when visible, so scroll first.
  await page.locator('#talents').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-meta-below-fold][data-hydrated="true"]')).toBeVisible()
  const trigger = page.locator('[data-meta-tooltip-trigger]').first()
  await expect(trigger).toBeVisible()
  await trigger.focus()
  const tip = page.locator('[data-meta-tooltip]').first()
  await expect(tip).toBeVisible()
  await expect(tip).toHaveAttribute('role', 'tooltip')
  await page.keyboard.press('Escape')
  await expect(tip).toBeHidden()

  const fireDark = await visit('/meta/mage/fire', 'dark', page)
  expect(fireDark.response?.status()).toBe(200)
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('#talents')).toBeVisible()
  const axeDark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(axeDark.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`), 'dark heatmap').toEqual([])

  const mage = await visit('/meta/mage', 'dark', page)
  expect(mage.response?.status()).toBe(200)
  await expect(page.locator('h1')).toHaveText('Mage · Mythic+ Meta')
  await expect(page.getByRole('link', { name: 'Fire' })).toBeVisible()

  const arcane = await visit('/meta/mage/arcane', 'dark', page)
  expect(arcane.response?.status()).toBe(200)
  await expect(page.getByRole('status').filter({ hasText: 'Collecting data.' })).toBeVisible()

  const missing = await page.goto('/meta/not-a-class')
  expect(missing?.status()).toBe(404)
})


test('gear tooltips stay visible and unclipped at 390 and 1280 px, and Escape closes a hover-opened panel', async ({ page }) => {
  const { response } = await visit('/meta/mage/fire', 'light', page)
  expect(response?.status()).toBe(200)
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.locator('#gear').scrollIntoViewIfNeeded()
    await expect(page.locator('[data-meta-below-fold][data-hydrated="true"]')).toBeVisible()
    const trigger = page.locator('#gear ol [data-meta-tooltip-trigger]').first()
    const tip = await assertUnclippedOpenTooltip(page, trigger)
    await page.keyboard.press('Escape')
    await expect(tip).toBeHidden()
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  const hoverTrigger = page.locator('#gear ol [data-meta-tooltip-trigger]').first()
  await hoverTrigger.scrollIntoViewIfNeeded()
  await hoverTrigger.hover()
  const hoverTipId = await hoverTrigger.getAttribute('aria-describedby')
  const hoverTip = page.locator(`[id="${hoverTipId}"]`)
  await expect(hoverTip).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hoverTip).toBeHidden()
})

test('role filters are plain links and no ad markup ships while NUXT_ADS is off', async ({ page }) => {
  await page.goto('/meta')
  await expect(page.getByRole('link', { name: 'DPS' })).toHaveAttribute('href', /role=dps/)
  await expect(page.getByRole('link', { name: 'Tank' })).toHaveAttribute('href', /role=tank/)
  await expect(page.getByRole('link', { name: 'Healer' })).toHaveAttribute('href', /role=healer/)
  await expect(page.getByText('Advertisement')).toHaveCount(0)
  await expect(page.locator('[data-ad-placement]')).toHaveCount(0)
})
