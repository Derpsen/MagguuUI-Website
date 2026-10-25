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

test('/imprint shows the legal notice without name or address', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/imprint')

  await expect(page.locator('h1').filter({ hasText: 'Legal notice' })).toBeVisible()
  await expect(page.getByText('MagguuUI is a free, non-commercial project operated from Switzerland.')).toBeVisible()
  await expect(page.getByText(/TMG|Impressum|Imprint/)).toHaveCount(0)
})

test('public settings expose no imprint name/address keys', async ({ request }) => {
  const response = await request.get('/api/v1/settings')
  expect(response.ok()).toBe(true)
  const body = JSON.stringify(await response.json())
  expect(body).not.toMatch(/imprint_|Germany/)
})

for (const path of ['/changelog', '/addons', '/profiles', '/configurator', '/about', '/imprint', '/privacy']) {
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

test('/imprint shows contact link and separate disclaimer', async ({ page }) => {
  await visitWithoutConsoleErrors(page, '/imprint')
  const contact = page.getByTestId('legal-contact')
  await expect(contact).toBeVisible()
  await expect(contact).toHaveAttribute('href', /^mailto:/)
  const disclaimer = page.getByTestId('legal-disclaimer')
  await expect(disclaimer.getByRole('heading', { name: 'Disclaimer' })).toBeVisible()
  await expect(disclaimer).toContainText('not officially affiliated')
})

test('home module cards show copyable /mui badges', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await visitWithoutConsoleErrors(page, '/')
  const features = page.getByRole('region', { name: 'Features' })
  await expect(features.locator('article')).toHaveCount(3)
  const badge = features.getByRole('button', { name: 'Copy /mui tools' })
  await badge.scrollIntoViewIfNeeded()
  await badge.click()
  await expect(badge).toHaveAttribute('data-copied', 'true')
  await expect(page.getByText('Copied /mui tools', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/mui tools')
  await expect(features.getByRole('list', { name: 'Optional Magguu profiles' }).getByText('Whisper Messenger')).toBeVisible()
})
