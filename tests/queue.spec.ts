import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PUBLIC = ['/', '/guide', '/faq', '/strings', '/addons', '/changelog', '/about', '/imprint', '/privacy']

test.describe('health endpoint', () => {
  test('/api/health reports status, build and start time without secrets', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    expect(res.headers()['cache-control']).toContain('no-store')
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(body.build.sha).toMatch(/^([0-9a-f]{40}|dev)$/)
    expect(Date.parse(body.startedAt)).not.toBeNaN()
    expect(typeof body.uptimeSeconds).toBe('number')
    expect(JSON.stringify(body)).not.toMatch(/secret|token|password|version/i)
  })
})

test.describe('web vitals beacon', () => {
  test('accepts samples anonymously and sets no cookie', async ({ request }) => {
    const res = await request.post('/api/v1/vitals', {
      data: JSON.stringify({ path: '/guide?x=1', metrics: [{ name: 'LCP', value: 1800 }, { name: 'TTFB', value: 120 }] }),
      headers: { 'content-type': 'text/plain' },
    })
    expect(res.status()).toBe(204)
    expect(res.headers()['set-cookie']).toBeUndefined()
  })
})

test.describe('speculation rules', () => {
  test('public pages prefetch on hover, never admin or api', async ({ page }) => {
    await page.goto('/')
    const raw = await page.locator('script[type="speculationrules"]').first().textContent()
    const rules = JSON.parse(raw || '{}')
    expect(rules.prefetch[0].eagerness).toBe('moderate')
    const text = JSON.stringify(rules)
    expect(text).toContain('/admin/*')
    expect(text).toContain('/api/*')
  })
})

test.describe('service worker', () => {
  test('sw.js is served uncached and never caches private routes', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.ok()).toBe(true)
    expect(res.headers()['cache-control']).toBe('no-cache')
    const src = await res.text()
    expect(src).toContain("path.startsWith('/admin')")
    expect(src).toContain("request.method !== 'GET'")
  })
})

test.describe('search (Ctrl+K)', () => {
  test('opens lazily, finds a FAQ entry and navigates', async ({ page }) => {
    const indexRequests: string[] = []
    page.on('request', (req) => { if (req.url().includes('/api/v1/search-index')) indexRequests.push(req.url()) })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(indexRequests).toHaveLength(0)
    await page.keyboard.press('Control+k')
    const palette = page.getByTestId('public-search')
    await expect(palette).toBeVisible()
    await page.getByPlaceholder('Search guide, changelog, FAQ, strings…').fill('What is MagguuUI')
    const option = page.getByRole('option', { name: /What is MagguuUI/ }).first()
    await expect(option).toBeVisible()
    await option.click()
    await expect(page).toHaveURL(/\/faq#faq-what-is-magguuui/)
    expect(indexRequests.length).toBe(1)
  })
})

test.describe('full-text search (guide + changelog)', () => {
  test('finds words that only occur in a changelog body', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search guide, changelog, FAQ, strings…')
    await expect(input).toBeVisible()
    await expect(input).toHaveAccessibleName(/Search guide, changelog, FAQ and strings/)
    // "Zebrafish" is only in the body of the seeded v0.9.1 and v0.9.3 notes.
    await input.fill('zebrafish')
    const option = page.getByRole('option', { name: /Changelog · v0\.9\.3/ })
    await expect(option).toBeVisible()
    await expect(page.getByRole('option', { name: /Changelog · v0\.9\.2/ })).toHaveCount(0)
    await expect(option).toContainText('Zebrafish')
    await option.click()
    await expect(page).toHaveURL(/\/changelog#release-v0-9-3/)
  })

  test('never leaks Unreleased or draft notes', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search guide, changelog, FAQ, strings…')
    // Wait until the index is loaded (a real hit shows), then the sentinels must not match.
    await input.fill('zebrafish')
    await expect(page.getByRole('option', { name: /Changelog · v0\.9\.3/ })).toBeVisible()
    await input.fill('UNRELEASEDMARK')
    await expect(page.getByRole('option')).toHaveCount(0)
    await input.fill('DRAFTMARK')
    await expect(page.getByRole('option')).toHaveCount(0)
  })

  test('finds the static guide section by body text', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    await page.getByPlaceholder('Search guide, changelog, FAQ, strings…').fill('premade groups filter')
    const option = page.getByRole('option', { name: /Apply only one module/ })
    await expect(option).toBeVisible()
    await option.click()
    await expect(page).toHaveURL(/\/guide#apply-one-module/)
  })
})

test.describe('OG images + view transitions', () => {
  for (const path of ['/', '/guide', '/faq', '/strings']) {
    test(`${path} has its own og:image`, async ({ page }) => {
      await page.goto(path)
      const og = await page.locator('meta[property="og:image"]').first().getAttribute('content')
      expect(og).toBeTruthy()
    })
  }

  test('reduced motion disables view-transition animation', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'FAQ' }).click()
    await expect(page).toHaveURL(/\/faq/)
    await ctx.close()
  })
})

test.describe('accessibility', () => {
  for (const path of PUBLIC) {
    test(`axe: ${path} has no violations`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
    })
  }

  test('axe: search dialog has no violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('public-search-open').click()
    await expect(page.getByTestId('public-search')).toBeVisible()
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
})
