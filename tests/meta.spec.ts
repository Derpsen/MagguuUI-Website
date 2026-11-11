import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

const TRADEMARK = /\b(?:WoW|World of Warcraft|Warcraft)\b/i

async function visit(path: string, theme: 'light' | 'dark', page: import('@playwright/test').Page) {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  await page.addInitScript(t => localStorage.setItem('nuxt-color-mode', t), theme)
  const response = await page.goto(path)
  await hydrated(page)
  return { response, problems }
}

test('/meta shows the empty state, methodology and attribution in light and dark, without trademarks or third-party scripts', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    const { response, problems } = await visit('/meta', theme, page)
    expect(response?.status(), theme).toBe(200)
    await expect(page.locator('h1')).toHaveText('Mythic+ Meta')
    await expect(page.locator('html')).toHaveClass(new RegExp(theme))
    await expect(page.getByRole('status').filter({ hasText: 'Collecting data.' })).toBeVisible()
    await expect(page.getByText('Data provided by Blizzard')).toBeVisible()
    await expect(page.getByText('Not affiliated with or endorsed by Blizzard Entertainment.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Methodology' })).toBeVisible()
    await expect(page.getByText('Low popularity ≠ unplayable.', { exact: true })).toBeVisible()
    const title = await page.title()
    expect(title).not.toMatch(TRADEMARK)
    expect(page.url()).not.toMatch(TRADEMARK)
    expect(await page.locator('script[src*="wowhead"], script[src*="icy-veins"], script[src*="murlok"], script[src*="archon"], script[src*="adsbygoogle"], script[src*="googlesyndication"]').count()).toBe(0)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([])
    expect(problems, theme).toEqual([])
  }
})

test('/meta/mage and /meta/mage/fire are known routes with empty data, 404 is used for unknown slugs', async ({ page }) => {
  const mage = await visit('/meta/mage', 'dark', page)
  expect(mage.response?.status()).toBe(200)
  await expect(page.locator('h1')).toHaveText('Mage · Mythic+ Meta')
  await expect(page.getByRole('status').filter({ hasText: 'Collecting data.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Fire' })).toBeVisible()

  const fire = await visit('/meta/mage/fire', 'light', page)
  expect(fire.response?.status()).toBe(200)
  await expect(page.locator('h1')).toHaveText('Fire Mage – Mythic+ Builds')
  await expect(page.getByRole('status').filter({ hasText: 'Collecting data.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'murlok.io' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Archon' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Icy Veins' })).toBeVisible()
  const title = await page.title()
  expect(title).not.toMatch(TRADEMARK)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(axe.violations.map(v => v.id)).toEqual([])

  const missing = await page.goto('/meta/not-a-class')
  expect(missing?.status()).toBe(404)
})


test('role filters are plain links and no ad markup ships while NUXT_ADS is off', async ({ page }) => {
  await page.goto('/meta')
  await expect(page.getByRole('link', { name: 'DPS' })).toHaveAttribute('href', /role=dps/)
  await expect(page.getByRole('link', { name: 'Tank' })).toHaveAttribute('href', /role=tank/)
  await expect(page.getByRole('link', { name: 'Healer' })).toHaveAttribute('href', /role=healer/)
  await expect(page.getByText('Advertisement')).toHaveCount(0)
  await expect(page.locator('[data-ad-placement]')).toHaveCount(0)
})
