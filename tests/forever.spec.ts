import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * MagguuUI Forever area (Camelot flavor in the MagguuUI package).
 * E2E sets NUXT_FOREVER_REPO=off, so GitHub WowUp reads stay null; pages still
 * render the verified pack lists and download/guide copy without errors.
 */
const PAGES = [
  { path: '/forever', h1: 'MagguuUI on Forever' },
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

test('release API answers null while the Forever repo lookup is off', async ({ request }) => {
  const res = await request.get('/api/v1/forever/release')
  expect(res.status()).toBe(200)
  expect((await res.json()).data).toBeNull()
})

test('wowup endpoint is null offline; strings page lists 13 addons and the WowUp hint', async ({ page, request }) => {
  const res = await request.get('/api/v1/forever/wowup')
  expect(res.status()).toBe(200)
  expect((await res.json()).data).toBeNull()
  await page.goto('/forever/strings')
  await expect(page.getByTestId('forever-addons').locator('li')).toHaveCount(13)
  await expect(page.getByTestId('forever-addons')).toContainText('MagguuUI')
  await expect(page.getByTestId('forever-addons')).toContainText('LittleWigs')
  await expect(page.getByTestId('forever-addons')).toContainText('Northern Sky Raid Tools')
  await expect(page.getByTestId('forever-addons')).not.toContainText(/\bWIM\b/)
  await expect(page.getByTestId('forever-wowup-hint')).toContainText('WowUp 2.24.1')
  await expect(page.getByTestId('forever-addons-starter').locator('li')).toHaveCount(5)
  await expect(page.getByTestId('forever-addons-optional').locator('li')).toHaveCount(8)
  await expect(page.getByTestId('forever-wowup-string')).toHaveCount(0)
})

test('download and guide describe the one-package Camelot flavor', async ({ page }) => {
  await page.goto('/forever/download')
  await expect(page.getByTestId('forever-download-copy')).toContainText('MagguuUI package')
  await expect(page.getByTestId('download-buttons').locator('a')).toHaveCount(3)
  await expect(page.getByTestId('forever-coming-soon')).toHaveCount(0)
  await page.goto('/forever/guide')
  await expect(page.getByRole('heading', { name: '2. Open Setup' })).toBeVisible()
  await expect(page.getByTestId('forever-coming-soon')).toHaveCount(0)
  await page.goto('/forever')
  await expect(page.getByTestId('forever-release-state')).toContainText('v12.1.9')
  await expect(page.locator('h1')).toHaveText('MagguuUI on Forever')
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
