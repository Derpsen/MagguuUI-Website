import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * useIsDark() SSR-emits text-white until mount. With the site JS stripped,
 * force html.light (the no-JS / system-light case) and check that the H1 is
 * still readable. Axe needs a JS-enabled Playwright context, so this loads
 * the SSR HTML + CSS only — no color-mode script, no Vue hydration.
 */
const paths = ['/guide', '/faq', '/news']

function withLightClass(html: string, baseURL: string) {
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<html\b[^>]*>/i, (tag) => {
    if (/\bclass\s*=/.test(tag)) {
      return tag.replace(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i, (_m, q, value) => {
        const next = value.replace(/\b(dark|light)\b/g, '').replace(/\s+/g, ' ').trim()
        return `class=${q}${`${next} light`.trim()}${q}`
      })
    }
    return tag.replace(/<html/i, '<html class="light"')
  })
  if (!/<base\b/i.test(out)) {
    out = out.replace(/<head\b[^>]*>/i, (tag) => `${tag}<base href="${baseURL.endsWith('/') ? baseURL : `${baseURL}/`}">`)
  }
  return out
}

for (const path of paths) {
  test(`${path} H1 stays readable without site JavaScript on a light page`, async ({ page, request, baseURL }) => {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    await page.setContent(withLightClass(await response.text(), baseURL || 'http://localhost:3000'), { waitUntil: 'networkidle' })

    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass, path).toMatch(/\blight\b/)
    expect(htmlClass, path).not.toMatch(/\bdark\b/)

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const color = await h1.evaluate((el) => getComputedStyle(el).color)
    const rgb = (color.match(/\d+/g) || []).map(Number)
    expect(rgb.length, `${path} H1 color ${color}`).toBeGreaterThanOrEqual(3)
    expect(rgb[0]! + rgb[1]! + rgb[2]!, `${path} H1 stayed light (${color}) on html.light`).toBeLessThan(80)

    const results = await new AxeBuilder({ page }).include('h1').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const contrast = results.violations.filter((v) => v.id === 'color-contrast')
    expect(contrast, `${path}: ${contrast.map((v) => v.nodes.map((n) => n.failureSummary).join('; ')).join(' | ')}`).toEqual([])
  })
}
