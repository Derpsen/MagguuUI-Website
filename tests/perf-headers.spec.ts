import { expect, test } from '@playwright/test'

test.describe('security + cache headers', () => {
  test('public HTML: HSTS 1y, no x-powered-by, browser revalidates, edge may cache', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
    const h = res.headers()
    expect(h['strict-transport-security']).toBe('max-age=31536000; includeSubDomains')
    expect(h['x-powered-by']).toBeUndefined()
    expect(h['cache-control']).toBe('public, max-age=0, must-revalidate')
    expect(h['cdn-cache-control']).toBe('public, max-age=120, stale-while-revalidate=600')
    expect(h['cloudflare-cdn-cache-control']).toBe('public, max-age=120, stale-while-revalidate=600')
  })

  test('catalog-summary is edge-cacheable', async ({ request }) => {
    const h = (await request.get('/api/v1/catalog-summary')).headers()
    expect(h['cdn-cache-control']).toBe('public, max-age=120, stale-while-revalidate=600')
    expect(h['x-powered-by']).toBeUndefined()
  })

  test('admin stays private no-store and never edge-cached', async ({ request }) => {
    const res = await request.get('/admin/login')
    const h = res.headers()
    expect(h['cache-control']).toContain('no-store')
    expect(h['cdn-cache-control']).toBeUndefined()
    const api = await request.get('/api/v1/admin/stats')
    expect(api.status()).toBe(401)
    expect(api.headers()['cache-control']).toContain('no-store')
    expect(api.headers()['cdn-cache-control']).toBeUndefined()
  })
})

test.describe('homepage screenshots', () => {
  test('serve AVIF/WebP srcsets', async ({ page }) => {
    await page.goto('/')
    const sources = page.locator('section[aria-label="Screenshots"] picture source[type="image/avif"]')
    await expect(sources).toHaveCount(3)
    await expect(sources.first()).toHaveAttribute('srcset', /hud-800\.avif 800w/)
    const avif = await page.request.get('/screenshots/hud-1280.avif')
    expect(avif.ok()).toBe(true)
  })
})

test.describe('lazy import strings', () => {
  test('WowUp list is slim; the full string loads on copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const list = await page.request.get('/api/v1/wowup?view=meta')
    const body = await list.json() as { data: Record<string, Record<string, unknown>> }
    const packs = Object.values(body.data)
    test.skip(packs.length === 0, 'no WowUp packs seeded')
    for (const pack of packs) {
      expect(pack).not.toHaveProperty('string')
      expect(typeof pack.stringLength).toBe('number')
    }

    const fetched: string[] = []
    page.on('request', (req) => { if (/\/api\/v1\/wowup\/\d+$/.test(new URL(req.url()).pathname)) fetched.push(req.url()) })
    const name = Object.keys(body.data)[0]!
    await page.goto(`/strings?pack=${encodeURIComponent(name)}`)
    await page.waitForLoadState('networkidle')
    expect(fetched).toHaveLength(0)

    const one = page.waitForResponse(res => /\/api\/v1\/wowup\/\d+$/.test(new URL(res.url()).pathname))
    await page.getByRole('button', { name: /Copy String/ }).first().click()
    const res = await one
    expect(res.ok()).toBe(true)
    await expect(page.getByRole('button', { name: /Copied!/ }).first()).toBeVisible()
  })
})
