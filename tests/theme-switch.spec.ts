import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Theme switch: no frame may show text on a background it cannot be read on (white text on the still-light page, or the
 * reverse) while the colours change. Every frame after the click is sampled in the browser (requestAnimationFrame) and the
 * contrast of the main texts against their effective background is computed from the live computed styles.
 */
const SAMPLED = ['h1', 'header nav a', 'main p', 'footer p', 'footer a']

async function sampleSwitch(page: Page, to: 'light' | 'dark') {
  return page.evaluate(async ({ selectors, to: target }) => {
    const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
    // Computed colours can be oklch()/color-mix(); a 1x1 canvas resolves any CSS colour to plain RGBA.
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })!
    const parse = (s: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return { r: r!, g: g!, b: b!, a: a! / 255 }
    }
    const lum = (c: { r: number, g: number, b: number }) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
    const effectiveBg = (el: Element) => {
      // composite the stack of translucent backgrounds from the element up to the page
      const layers: Array<{ r: number, g: number, b: number, a: number }> = []
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor)
        if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break }
      }
      let out = { r: 255, g: 255, b: 255 }
      for (const l of layers.reverse()) out = { r: l.r * l.a + out.r * (1 - l.a), g: l.g * l.a + out.g * (1 - l.a), b: l.b * l.a + out.b * (1 - l.a) }
      return out
    }
    const els = selectors.map(s => document.querySelector(s)).filter((e): e is Element => !!e)
    const contrastNow = () => Math.min(...els.map((el) => {
      const fg = parse(getComputedStyle(el).color)
      const bg = effectiveBg(el)
      const a = lum({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) }); const b = lum(bg)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }))
    const button = document.querySelector<HTMLButtonElement>('[data-color-mode-toggle]')!
    const frames: number[] = []
    button.click()
    const start = performance.now()
    await new Promise<void>((done) => {
      const tick = () => { try { frames.push(Math.round(contrastNow() * 100) / 100) } catch { frames.push(-1) } if (performance.now() - start < 700) requestAnimationFrame(tick); else done() }
      requestAnimationFrame(tick)
    })
    return { frames, settled: document.documentElement.classList.contains(target) }
  }, { selectors: SAMPLED, to })
}

for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test.describe(name, () => {
    test.use({ viewport })
    for (const start of ['dark', 'light'] as const) {
      test(`switching from ${start}: readable in every frame`, async ({ page }) => {
        await page.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), start)
        await page.goto('/faq')
        await hydrated(page)
        await page.waitForTimeout(500) // let the initial colours settle
        const target = start === 'dark' ? 'light' : 'dark'
        const { frames, settled } = await sampleSwitch(page, target)
        await page.screenshot({ path: `test-results/theme-switch-${name}-${start}-to-${target}.png` })
        expect(settled).toBe(true)
        expect(frames.length).toBeGreaterThan(10)
        const worst = Math.min(...frames)
        expect(worst, `lowest contrast in any frame: ${worst} (frames: ${frames.join(' ')})`).toBeGreaterThanOrEqual(3)
      })
    }
  })
}
