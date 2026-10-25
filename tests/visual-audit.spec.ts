import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/** Desktop audit of the three main public pages in both themes: no console errors, no axe violations, screenshots kept. */
test.use({ viewport: { width: 1280, height: 800 } })

for (const path of ['/', '/guide', '/strings']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${path} ${theme}: no console errors, axe clean`, async ({ page }) => {
      const problems: string[] = []
      page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
      page.on('pageerror', e => problems.push(`pageerror: ${e.message}`))
      await page.addInitScript(t => localStorage.setItem('nuxt-color-mode', t), theme)
      await page.goto(path)
      await hydrated(page)
      await page.waitForTimeout(400)
      await expect(page.locator('html')).toHaveClass(new RegExp(theme))
      await page.screenshot({ path: `test-results/audit-${path === '/' ? 'home' : path.slice(1)}-${theme}.png`, fullPage: true })
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 4).join(' | ')}`)).toEqual([])
      expect(problems).toEqual([])
    })
  }
}
