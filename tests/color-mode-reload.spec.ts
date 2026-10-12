import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Regression: a stored light preference must survive a full reload. SSR renders
// the dark fallback; before the fix Vue kept the dark text classes after
// hydration, so headings/body stayed near-white on the light background.

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

async function textColors(page: Page) {
  return page.evaluate(() => {
    const pick = (sel: string) => {
      const el = document.querySelector(sel)
      return el ? getComputedStyle(el).color : ''
    }
    return { h1: pick('main h1, h1'), p: pick('main p, p') }
  })
}

for (const path of ['/', '/imprint']) {
  test(`light preference survives reload on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const dark = await textColors(page)
    expect(luminance(dark.h1), 'default theme is dark (light heading text)').toBeGreaterThan(0.5)

    await page.evaluate(() => localStorage.setItem('nuxt-color-mode', 'light'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('html')).toHaveClass(/(^|\s)light(\s|$)/)
    await expect.poll(async () => luminance((await textColors(page)).h1)).toBeLessThan(0.2)
    const light = await textColors(page)
    expect(light.h1).not.toBe(dark.h1)
    expect(luminance(light.p), 'body text is dark on light theme').toBeLessThan(0.3)
  })
}
