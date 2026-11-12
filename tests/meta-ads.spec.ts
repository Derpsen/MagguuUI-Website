import { expect, test } from '@playwright/test'
import { isNuxtAdsEnabled } from '../utils/metaUiCopy'

/**
 * Layout of the sidebar slot with ads on. Default CI leaves NUXT_ADS off so
 * this file is skipped there (a second dev server would risk OOM). Run with
 * `NUXT_ADS=on` against a server started with the same flag, after the main
 * e2e suite, not in parallel.
 */
test.beforeEach(() => {
  test.skip(!isNuxtAdsEnabled(process.env.NUXT_ADS), 'requires NUXT_ADS=on on the test process and the server')
})

test('sidebar ad is only visible at xl and stays at least 150px from the copy control', async ({ page }) => {
  await page.setViewportSize({ width: 1279, height: 900 })
  await page.goto('/meta/mage/fire')
  await expect(page.locator('[data-ad-placement="sidebar"]')).toBeHidden()

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/meta/mage/fire')
  const sidebar = page.locator('[data-ad-placement="sidebar"]')
  await expect(sidebar).toBeVisible()
  const copy = page.getByRole('button', { name: /copy/i }).first()
  await expect(copy).toBeVisible()
  const adBox = await sidebar.boundingBox()
  const copyBox = await copy.boundingBox()
  expect(adBox && copyBox, 'expected boxes for ad and copy control').toBeTruthy()
  const dx = adBox!.x >= copyBox!.x + copyBox!.width
    ? adBox!.x - (copyBox!.x + copyBox!.width)
    : copyBox!.x - (adBox!.x + adBox!.width)
  const dy = adBox!.y >= copyBox!.y + copyBox!.height
    ? adBox!.y - (copyBox!.y + copyBox!.height)
    : copyBox!.y - (adBox!.y + adBox!.height)
  const distance = Math.hypot(Math.max(0, dx), Math.max(0, dy))
  expect(distance, `distance ${distance}`).toBeGreaterThanOrEqual(150)
})
