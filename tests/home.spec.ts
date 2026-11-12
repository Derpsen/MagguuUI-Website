import { expect, test } from '@playwright/test'

/** Home (redesign PR 2): the hero names the three ways in (Install & Setup, Import Strings, downloads) and the steps. */
test('hero: one H1, Install & Setup, Import Strings, three steps, Apply Magguu profiles', async ({ page }) => {
  await page.goto('/')
  const hero = page.locator('section[aria-label="Hero"]')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toContainText('MagguuUI')
  await expect(hero.getByRole('link', { name: 'Install & Setup' })).toHaveAttribute('href', '/guide')
  await expect(hero.getByRole('link', { name: 'Import Strings' })).toHaveAttribute('href', '/strings')
  await expect(page.getByTestId('home-hero-steps').locator('li')).toHaveCount(3)
  await expect(hero).toContainText('Apply Magguu profiles')
})

test('home works without JavaScript on a narrow screen and has no horizontal scroll', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } })
  const page = await context.newPage()
  await page.goto('http://localhost:3000/')
  await expect(page.locator('h1')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await context.close()
})
