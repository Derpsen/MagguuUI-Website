import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

const PUBLISHED = [
  'wow-forever-now-live',
  'midnight-12-1-5-mid-season',
  'wow-forever-november-hotfixes',
  'discord-guild-chat-linking',
] as const
const UNPUBLISHED = 'pouch-of-violet-dust-launch-celebration'

test('the news index lists the four published seed articles and not the unpublished pouch drop', async ({ page }) => {
  await page.goto('/news')
  await hydrated(page)
  await expect(page.getByRole('heading', { level: 1, name: 'News' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'World of Warcraft: Forever Is Now Live' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Pouch of Violet Dust/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Installation Guide' })).toHaveAttribute('href', '/guide')
  await expect(page.getByRole('link', { name: 'Mythic+ Meta' })).toHaveAttribute('href', '/meta')
  await expect(page.getByRole('link', { name: 'RSS feed' })).toHaveAttribute('href', '/news/feed.xml')
})

test('a published article is SSR, uses sanitized HTML, and exposes NewsArticle JSON-LD', async ({ page, request }) => {
  const res = await request.get('/news/wow-forever-now-live')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain('World of Warcraft: Forever Is Now Live')
  expect(html).toContain('application/ld+json')
  expect(html).toContain('"@type":"NewsArticle"')
  // SafeHtml is the audited boundary; do not scan the whole document for the
  // substring 'v-html' (it appears in the component's eslint comment).
  expect(html).not.toMatch(/\sv-html=/)
  expect(html).toContain('prose-custom')

  await page.goto('/news/wow-forever-now-live')
  await hydrated(page)
  await expect(page.getByRole('heading', { level: 1, name: 'World of Warcraft: Forever Is Now Live' })).toBeVisible()
  await expect(page.locator('.prose-custom')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Installation Guide' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mythic+ Meta' })).toBeVisible()
  const jsonLd = page.locator('script[type="application/ld+json"]')
  const raw = await jsonLd.first().textContent()
  const data = JSON.parse(raw || '{}') as { '@type'?: string, headline?: string, author?: { name?: string } }
  expect(data['@type']).toBe('NewsArticle')
  expect(data.headline).toBe('World of Warcraft: Forever Is Now Live')
  expect(data.author?.name).toBe('Magguu')
})

test('unpublished and unknown slugs are 404', async ({ request }) => {
  expect((await request.get(`/news/${UNPUBLISHED}`)).status()).toBe(404)
  expect((await request.get('/api/v1/news/' + UNPUBLISHED)).status()).toBe(404)
  expect((await request.get('/news/does-not-exist')).status()).toBe(404)
})

test('the public news API omits unpublished articles and article bodies on the list', async ({ request }) => {
  const res = await request.get('/api/v1/news')
  expect(res.status()).toBe(200)
  const body = await res.json() as { data: Array<{ slug: string, body?: string }> }
  const slugs = body.data.map(item => item.slug).sort()
  expect(slugs).toEqual([...PUBLISHED].sort())
  expect(body.data.every(item => item.body === undefined)).toBeTruthy()
})

test('the RSS feed lists published articles only', async ({ request }) => {
  const res = await request.get('/news/feed.xml')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('xml')
  const xml = await res.text()
  expect(xml).toContain('<title>MagguuUI news</title>')
  for (const slug of PUBLISHED) {
    expect(xml).toContain(`/news/${slug}`)
  }
  expect(xml).not.toContain(UNPUBLISHED)
})

for (const theme of ['light', 'dark'] as const) {
  for (const path of ['/news', '/news/wow-forever-now-live'] as const) {
    test(`axe: ${path} is clean in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript(t => localStorage.setItem('nuxt-color-mode', t), theme)
      await page.goto(path)
      await hydrated(page)
      await expect(page.locator('html')).toHaveClass(new RegExp(theme))
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 4).join(' | ')}`)).toEqual([])
    })
  }
}
