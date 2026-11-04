import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

const DOWNLOADS = [
  'https://www.curseforge.com/wow/addons/magguuui',
  'https://addons.wago.io/addons/5NR84pK3',
  'https://www.wowinterface.com/downloads/info27061',
]

test('home: one primary button, the three real download links, closing CTA', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  const hero = page.locator('section[aria-label="Hero"]')
  await expect(hero.locator('.btn-gradient')).toHaveCount(1)
  await expect(hero.getByTestId('download-buttons').locator('a')).toHaveCount(3)
  expect(await hero.getByTestId('download-buttons').locator('a').evaluateAll(a => a.map(x => (x as HTMLAnchorElement).href))).toEqual(DOWNLOADS)
  const closing = page.getByTestId('home-closing-cta')
  await expect(closing.locator('.btn-gradient')).toHaveCount(1)
  await expect(closing.locator('.btn-gradient')).toHaveText(/CurseForge/)
})

test('guide and forever offer the same download row', async ({ page }) => {
  for (const path of ['/guide', '/forever']) {
    await page.goto(path)
    expect(await page.getByTestId('download-buttons').first().locator('a').evaluateAll(a => a.map(x => (x as HTMLAnchorElement).href))).toEqual(DOWNLOADS)
  }
  await expect(page.getByTestId('forever-next-step').getByRole('link', { name: 'Retail changelog' })).toHaveAttribute('href', '/changelog')
})

test('screenshot lightbox: focus moves in, Tab stays in, Escape closes and restores focus', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  const trigger = page.getByRole('button', { name: 'Open Setup full size' })
  await trigger.click()
  const box = page.getByTestId('screenshot-lightbox')
  await expect(box).toBeVisible()
  await expect(box.getByRole('button', { name: 'Close' }).first()).toBeFocused()
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    expect(await box.evaluate(el => el.contains(document.activeElement))).toBe(true)
  }
  await expect(box).toContainText('MagguuUI Setup inside EllesmereUI')
  await page.keyboard.press('Escape')
  await expect(box).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('home addon rows carry an icon, a badge and Whisper Messenger, never WIM', async ({ page }) => {
  await page.goto('/')
  const list = page.getByTestId('home-addon-list')
  await expect(list.locator('li').first()).toContainText('Required')
  await expect(list).toContainText('Whisper Messenger')
  await expect(list).not.toContainText(/\bWIM\b/)
  expect(await list.locator('li img').count()).toBeGreaterThan(3)
})
