import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * MagguuUI x Forever area. The E2E server runs with NUXT_FOREVER_REPO=off, so no
 * release exists and every page must show its Coming-soon state without errors.
 */
const PAGES = [
  { path: '/forever', h1: 'MagguuUI x Forever' },
  { path: '/forever/guide', h1: 'Guide' },
  { path: '/forever/download', h1: 'Download' },
  { path: '/forever/strings', h1: 'Strings' },
]

for (const { path, h1 } of PAGES) {
  test(`${path} renders with title, canonical and OG`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText(h1)
    await expect(page).toHaveTitle(/Forever/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`))
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Forever/)
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  })
}

test('release API answers null while no release exists', async ({ request }) => {
  const res = await request.get('/api/v1/forever/release')
  expect(res.status()).toBe(200)
  expect((await res.json()).data).toBeNull()
})

test('wowup endpoint is null and the strings page shows the addon list, hint and Coming soon', async ({ page, request }) => {
  const res = await request.get('/api/v1/forever/wowup')
  expect(res.status()).toBe(200)
  expect((await res.json()).data).toBeNull()
  await page.goto('/forever/strings')
  await expect(page.getByTestId('forever-addons').locator('li')).toHaveCount(11)
  await expect(page.getByTestId('forever-addons')).toContainText('Northern Sky Raid Tools')
  await expect(page.getByTestId('forever-wowup-hint')).toContainText('WowUp 2.24.1')
  await expect(page.getByTestId('forever-coming-soon')).toContainText('WowUp string')
  await expect(page.getByTestId('forever-wowup-string')).toHaveCount(0)
})

test('download, guide and strings show Coming soon without a release', async ({ page }) => {
  await page.goto('/forever/download')
  await expect(page.getByTestId('forever-coming-soon')).toContainText('Download available once the first release is published.')
  await expect(page.getByTestId('forever-release')).toHaveCount(0)
  for (const path of ['/forever/guide', '/forever/strings']) {
    await page.goto(path)
    await expect(page.getByTestId('forever-coming-soon')).toBeVisible()
  }
  await page.goto('/forever')
  await expect(page.getByTestId('forever-release-state')).toContainText('Not published yet')
})

test.describe('desktop product switch', () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test('switches between the Retail and Forever nav', async ({ page }) => {
    await page.goto('/')
    await hydrated(page)
    const sw = page.getByTestId('product-switch')
    await expect(sw.locator('[aria-current="page"]')).toHaveText('Retail')
    const primary = page.getByRole('navigation', { name: 'Primary' })
    await expect(primary.getByRole('link', { name: 'Import Strings' })).toBeVisible()
    await sw.getByRole('link', { name: 'Forever' }).click()
    await expect(page).toHaveURL(/\/forever$/)
    await expect(sw.locator('[aria-current="page"]')).toHaveText('Forever')
    await expect(primary.getByRole('link', { name: 'Download' })).toBeVisible()
    await expect(primary.getByRole('link', { name: 'Import Strings' })).toHaveCount(0)
    await primary.getByRole('link', { name: 'Download' }).click()
    await expect(page).toHaveURL(/\/forever\/download$/)
    await sw.getByRole('link', { name: 'Retail' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(primary.getByRole('link', { name: 'Import Strings' })).toBeVisible()
  })
})

test.describe('mobile product switch', () => {
  test.use({ viewport: { width: 320, height: 700 } })
  test('the menu offers both products', async ({ page }) => {
    await page.goto('/forever/guide')
    await hydrated(page)
    await page.getByRole('button', { name: 'Open menu' }).click()
    const sw = page.getByTestId('product-switch-mobile')
    await expect(sw.locator('[aria-current="page"]')).toHaveText('Forever')
    const dialog = page.getByRole('dialog', { name: 'Mobile navigation' })
    await expect(dialog.getByRole('link', { name: 'Strings', exact: true })).toBeVisible()
    await sw.getByRole('link', { name: 'Retail' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
