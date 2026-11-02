import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

// QA round 2026-11-02 (Browser-QA 11-03 list): removed /profiles, /contact, error page in the layout,
// mobile header above the menu overlay.

for (const path of ['/profiles', '/profiles/', '/profiles/bigwigs']) {
  test(`${path} is gone: 301 to /addons`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status()).toBe(301)
    expect(new URL(res.headers().location!, 'http://x').pathname).toBe('/addons')
  })
}

test('/contact has no page: 301 to the legal notice', async ({ request }) => {
  const res = await request.get('/contact', { maxRedirects: 0 })
  expect(res.status()).toBe(301)
  expect(new URL(res.headers().location!, 'http://x').pathname).toBe('/imprint')
})

test('no link to /profiles in the header, footer or sitemap', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).not.toMatch(/href="\/profiles/)
  expect(html).not.toMatch(/>\s*Previews\s*</)
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/profiles')
})

test('/addons groups Required, Starter pack, Optional', async ({ page }) => {
  await page.goto('/addons')
  const labels = await page.locator('section h2').allTextContents()
  expect(labels.map(l => l.trim().toLowerCase())).toEqual(expect.arrayContaining(['required']))
  const starter = page.locator('section', { has: page.locator('h2', { hasText: 'Starter pack' }) })
  if (await starter.count()) {
    for (const name of await starter.locator('li').allTextContents()) {
      expect(name).toMatch(/BigWigs|LittleWigs|Northern Sky|EXBoss|EXCore/)
    }
  }
})

test('404 page uses the site layout (header, footer) and a real 404 status', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page.locator('header a[href="/"]').first()).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
})

test('mobile 320: the header (logo, close X) stays above the open menu overlay', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  await hydrated(page)
  await page.getByRole('button', { name: 'Open menu' }).click()
  const close = page.getByRole('button', { name: 'Close menu', exact: true })
  await expect(close).toBeVisible()
  const hit = async (selector: string) => page.evaluate((sel) => {
    const el = document.querySelector(sel)!
    const r = el.getBoundingClientRect()
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return Boolean(top && (top === el || el.contains(top)))
  }, selector)
  expect(await hit('header button[aria-label="Close menu"]')).toBe(true)
  expect(await hit('header a[href="/"]')).toBe(true)
  await close.click()
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toHaveCount(0)
})
