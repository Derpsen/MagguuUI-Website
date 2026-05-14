import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function visitWithoutConsoleErrors(page: Page, path: string) {
  const consoleIssues: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || /Hydration|\[Vue warn\]/i.test(msg.text())) {
      consoleIssues.push(`${msg.type()}: ${msg.text()}`)
    }
  })

  const response = await page.goto(path)
  await page.waitForLoadState('networkidle')

  expect(consoleIssues, `Console warnings/errors on ${path}`).toHaveLength(0)
  return response
}

test('homepage loads with hero and CTA', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/')

  await expect(page).toHaveTitle(/MagguuUI/i)
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('a[href="/strings"]').first()).toBeVisible()
})

test('/strings loads with addon sections or empty state visible', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/strings')

  await expect(page.getByRole('heading', { name: 'Import Strings' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Import string categories' })).toBeVisible()
  await expect(page.getByRole('tabpanel')).toBeVisible()
})

test('/guide loads with step section or skeleton', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/guide')

  const hasContent = await page.locator('section, .step, [class*="step"], [class*="skeleton"]').first().isVisible().catch(() => false)
  expect(hasContent, 'Expected step section or skeleton on /guide').toBe(true)
})

test('/faq loads with FAQ heading', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/faq')

  await expect(page.locator('h1, h2').filter({ hasText: /faq|frequently/i }).first()).toBeVisible()
})

for (const path of ['/changelog', '/addons', '/about', '/imprint', '/privacy']) {
  test(`${path} loads without HTTP 500`, async ({ page }) => {
    const response = await visitWithoutConsoleErrors(page, path)
    expect(response?.status(), `HTTP status for ${path}`).not.toBe(500)
  })
}

test('color-mode toggle flips html class between light and dark', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/')

  const toggle = page.locator('[data-color-mode-toggle], button[aria-label*="color"], button[aria-label*="theme"], button[aria-label*="mode"], .color-mode-toggle').first()
  await expect(toggle).toBeVisible()

  const htmlEl = page.locator('html')
  const before = await htmlEl.getAttribute('class') ?? ''
  await toggle.click()
  const after = await htmlEl.getAttribute('class') ?? ''

  expect(before).not.toEqual(after)
  const modes = ['light', 'dark']
  const beforeMode = modes.find((m) => before.includes(m))
  const afterMode = modes.find((m) => after.includes(m))
  expect(afterMode).toBeDefined()
  expect(afterMode).not.toEqual(beforeMode)
})
