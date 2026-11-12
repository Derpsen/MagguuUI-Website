import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Public shell (redesign PR 1 follow-ups): header height, hamburger semantics (aria, scroll lock, focus return),
 * the menu without JavaScript between 1024 and 1279 px, and the empty ad region.
 */

test('header is exactly 56px tall and the ad region adds no gap while no ad renders', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/guide')
    await hydrated(page)
    const header = await page.locator('header.mg-header').evaluate(el => el.getBoundingClientRect().height)
    expect(header, `header height at ${viewport.width}`).toBe(56)
    const margin = await page.locator('.mg-ad-region').evaluate(el => getComputedStyle(el).marginTop)
    expect(margin).toBe('0px')
  }
})

test('hamburger: aria-expanded, aria-controls, scroll lock, Escape returns focus to the button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await hydrated(page)
  const button = page.getByRole('button', { name: 'Open menu' })
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(button).toHaveAttribute('aria-controls', 'mobile-menu')
  await button.click()
  const dialog = page.getByRole('dialog', { name: 'Mobile navigation' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('id', 'mobile-menu')
  const toggle = page.locator('header button[aria-controls="mobile-menu"]')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('html')).toHaveClass(/mg-scroll-lock/)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('html')).not.toHaveClass(/mg-scroll-lock/)

  // A link click navigates and releases the lock as well.
  await toggle.click()
  await dialog.getByRole('link', { name: 'News' }).click()
  await expect(page).toHaveURL(/\/news$/)
  await expect(page.locator('html')).not.toHaveClass(/mg-scroll-lock/)
})

test('1100px without JavaScript: the details menu reaches Meta and News', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1100, height: 800 } })
  const page = await context.newPage()
  await page.goto('http://localhost:3000/')
  const menu = page.getByTestId('nojs-menu')
  await expect(menu).toBeVisible()
  await expect(page.locator('header nav[aria-label="Primary"]')).toBeHidden()
  await menu.locator('summary').click()
  const meta = menu.getByRole('link', { name: 'Meta', exact: true })
  const news = menu.getByRole('link', { name: 'News', exact: true })
  await expect(meta).toBeVisible()
  await expect(meta).toHaveAttribute('href', '/meta')
  await expect(news).toHaveAttribute('href', '/news')
  await news.click()
  await expect(page).toHaveURL(/\/news$/)
  await context.close()
})

test('at 1280px the full navigation is in the header, the fallback menu is not', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await hydrated(page)
  await expect(page.locator('header nav[aria-label="Primary"] a[href="/meta"]')).toBeVisible()
  await expect(page.getByTestId('nojs-menu')).toHaveCount(0)
})
