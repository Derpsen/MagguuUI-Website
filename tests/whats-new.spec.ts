import { expect, test } from '@playwright/test'

/**
 * "What's new" banner. The newest published release is read from the API (the
 * dev database may hold more releases than the E2E seed); an older "last seen"
 * value is simulated with v0.0.1. Drafts and Unreleased never count.
 */
let LATEST = ''
test.beforeAll(async ({ request }) => {
  LATEST = (await (await request.get('/api/v1/release-stamps')).json()).data[0].version as string
})
const banner = (page: import('@playwright/test').Page) => page.getByTestId('whats-new')
const lastSeen = (page: import('@playwright/test').Page) => page.evaluate(() => localStorage.getItem('lastSeenVersion'))

test('first-time visitors see nothing; the newest version is just recorded', async ({ page }) => {
  await page.goto('/guide')
  await expect.poll(() => lastSeen(page)).toBe(LATEST)
  await expect(banner(page)).toHaveCount(0)
  expect((await page.context().cookies()).map(c => c.name)).toEqual(['mg_consent']) // only the stored choice from playwright.config.ts
})

test('a newer release shows the banner, linking to the changelog since the previous version', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lastSeenVersion', 'v0.0.1'))
  await page.goto('/guide')
  const region = page.getByRole('region', { name: 'New release' })
  await expect(region).toBeVisible()
  await expect(region).toContainText(`MagguuUI ${LATEST.replace(/^v/, '')} is out`)
  await expect(page.getByTestId('whats-new-link')).toHaveAttribute('href', '/changelog?since=0.0.1')
  // The banner is rendered after mount only: it is not in the server HTML.
  const html = await (await page.request.get('/guide')).text()
  expect(html).not.toContain('whats-new')
})

test('dismiss hides it, remembers the version and stays away after reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('lastSeenVersion', 'v0.0.1')
    }
  })
  await page.goto('/guide')
  await expect(banner(page)).toBeVisible()
  await page.getByTestId('whats-new-dismiss').focus()
  await page.keyboard.press('Enter')
  await expect(banner(page)).toHaveCount(0)
  expect(await lastSeen(page)).toBe(LATEST)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(banner(page)).toHaveCount(0)
})

test('Escape inside the banner dismisses it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lastSeenVersion', 'v0.0.1'))
  await page.goto('/')
  await expect(banner(page)).toBeVisible()
  await page.getByTestId('whats-new-link').focus()
  await page.keyboard.press('Escape')
  await expect(banner(page)).toHaveCount(0)
})

test('following the link opens the changelog filter and marks the release as seen', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('lastSeenVersion', 'v0.0.1')
    }
  })
  await page.goto('/guide')
  await page.getByTestId('whats-new-link').click()
  await expect(page).toHaveURL(/\/changelog\?since=0\.0\.1/)
  await expect(page.getByTestId('changelog-status')).toContainText('newer than 0.0.1')
  await expect(banner(page)).toHaveCount(0)
  expect(await lastSeen(page)).toBe(LATEST)
})

test('the banner does not move the page (no layout shift)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lastSeenVersion', 'v0.0.1'))
  await page.goto('/guide')
  const top = await page.locator('main, #main-content').first().evaluate(el => el.getBoundingClientRect().top)
  await expect(banner(page)).toBeVisible()
  const after = await page.locator('main, #main-content').first().evaluate(el => el.getBoundingClientRect().top)
  expect(after).toBe(top)
  expect(await banner(page).evaluate(el => getComputedStyle(el).position)).toBe('fixed')
})

test('works in the light theme', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lastSeenVersion', 'v0.0.1')
    localStorage.setItem('nuxt-color-mode', 'light')
  })
  await page.goto('/guide')
  await expect(banner(page)).toBeVisible()
  const bg = await banner(page).evaluate(el => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')
})
