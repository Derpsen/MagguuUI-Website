import { expect, test } from '@playwright/test'

/**
 * Sitemap, robots, per-page robots rules and OG images (@nuxtjs/sitemap,
 * @nuxtjs/robots, nuxt-og-image). The dev server is not "indexable" for the
 * robots module (Disallow: / outside production) unless asked with
 * ?mockProductionEnv, and it builds URLs from the request origin.
 */
test('sitemap.xml lists the public pages, never admin, api, feeds or query variants', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('xml')
  const xml = await res.text()
  // Dev answers with the request origin; production uses site.url (checked live).
  for (const path of ['/', '/strings', '/guide', '/addons', '/changelog', '/faq', '/about', '/imprint', '/privacy']) {
    expect(xml).toMatch(new RegExp(`<loc>https?://[^/<]+${path}</loc>`))
  }
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]!)
  expect(locs).toHaveLength(9)
  expect(locs.join('\n')).not.toMatch(/\/admin|\/api\/|feed\.xml|atom\.xml|\?/)
  expect(xml.toLowerCase()).not.toContain('nuxtjs/sitemap')
  expect(xml).not.toContain('<xhtml:link')
})

test('robots.txt points at the sitemap and carries no module credit', async ({ request }) => {
  const res = await request.get('/robots.txt?mockProductionEnv')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('text/plain')
  const txt = await res.text()
  // ?mockProductionEnv makes the dev server answer with the production rules.
  expect(txt).toMatch(/Sitemap: https?:\/\/[^/\s]+\/sitemap\.xml/)
  expect(txt).toContain('Disallow: /admin/')
  expect(txt).toContain('Disallow: /api/')
  expect(txt).toContain('Allow: /')
  expect(txt.toLowerCase()).not.toContain('nuxt-robots')
})

test('the unfiltered changelog is indexable, filtered views are noindex', async ({ page, request }) => {
  const plain = await request.get('/changelog')
  expect(plain.headers()['x-robots-tag'] ?? '').not.toContain('noindex')
  const filtered = await request.get('/changelog?since=0.9.1')
  expect(filtered.headers()['x-robots-tag']).toContain('noindex')
  await page.goto('/changelog?since=0.9.1')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('admin login stays noindex', async ({ request }) => {
  const res = await request.get('/admin/login')
  expect(res.headers()['x-robots-tag']).toContain('noindex')
})

for (const path of ['/guide', '/changelog']) {
  test(`${path} has its own OG image that renders as PNG`, async ({ page, request }) => {
    await page.goto(path)
    const og = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(og).toContain('/_og/')
    const res = await request.get(og!.replace('https://ui.magguu.xyz', ''))
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
  })
}
