import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function expectNoConsoleErrors(page: Page, path: string) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  expect(errors, `Console errors on ${path}`).toHaveLength(0)
}

test('homepage loads with hero and CTA', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveTitle(/MagguuUI/i)
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('a[href="/strings"]').first()).toBeVisible()
  expect(errors, 'Console errors on /').toHaveLength(0)
})

test('/strings loads — addon sections or empty state visible', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/strings')
  await page.waitForLoadState('networkidle')
  const hasSection = await page.locator('h2, h3').first().isVisible().catch(() => false)
  const hasEmpty = await page.locator('[data-empty], .empty-state, [class*="empty"]').first().isVisible().catch(() => false)
  expect(hasSection || hasEmpty, 'Expected addon sections or empty-state on /strings').toBe(true)
  expect(errors, 'Console errors on /strings').toHaveLength(0)
})

test('/guide loads with step section or skeleton', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/guide')
  await page.waitForLoadState('networkidle')
  const hasContent = await page.locator('section, .step, [class*="step"], [class*="skeleton"]').first().isVisible().catch(() => false)
  expect(hasContent, 'Expected step section or skeleton on /guide').toBe(true)
  expect(errors, 'Console errors on /guide').toHaveLength(0)
})

test('/faq loads with FAQ heading', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/faq')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1, h2').filter({ hasText: /faq|frequently/i }).first()).toBeVisible()
  expect(errors, 'Console errors on /faq').toHaveLength(0)
})

for (const path of ['/changelog', '/addons', '/about', '/imprint', '/privacy']) {
  test(`${path} loads without HTTP 500`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    const response = await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(response?.status(), `HTTP status for ${path}`).not.toBe(500)
    expect(errors, `Console errors on ${path}`).toHaveLength(0)
  })
}

test('color-mode toggle flips html class between light and dark', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const toggle = page.locator('button[aria-label*="color"], button[aria-label*="theme"], button[aria-label*="mode"], [data-color-mode-toggle], .color-mode-toggle').first()
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
