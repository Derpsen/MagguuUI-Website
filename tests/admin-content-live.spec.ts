import { expect, test } from '@playwright/test'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'

/**
 * Admin edit → public page shows it on the next request (SWR route cache is
 * cleared on admin writes) → restore. One login per run (login is rate-limited).
 */

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'

test.describe.configure({ mode: 'serial' })

let context: BrowserContext
let page: Page
let api: APIRequestContext

const stamp = () => `E2E ${Date.now().toString(36)}`

async function json<T>(res: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  expect(res.ok(), `${res.url()} → ${res.status()}`).toBe(true)
  const body = await res.json() as { data: T }
  return body.data
}

async function bulk(items: Array<{ page: string, section: string, key: string, value: string }>) {
  await json(await api.post('/api/v1/admin/content/bulk', { data: { items: items.map(i => ({ ...i, locale: 'en' })) } }))
}

async function adminContent(pageKey: string) {
  return json<Record<string, Record<string, Record<string, string>>>>(await api.get(`/api/v1/admin/content/${pageKey}`))
}

/** Warm the SWR cache, run the change, expect the public HTML to show it right away. */
async function expectLive(path: string, text: string) {
  await page.goto(path)
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  api = context.request
  const res = await api.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  await context?.close()
})

test('admin dashboard shows the live image SHA + build time as text', async () => {
  await page.goto('/admin')
  const line = page.getByTestId('admin-live-build')
  await expect(line).toBeVisible({ timeout: 30_000 })
  // Local/dev servers have no build args: fallback is `dev`.
  await expect(line).toHaveText(/^\s*Live: ([0-9a-f]{7}|dev) · built (dev|\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC)$/)
})

test('home hero eyebrow + step (admin form) is live on /', async () => {
  await page.goto('/')
  const before = await adminContent('home')
  const prevEyebrow = before.en?.hero?.eyebrow ?? ''
  const value = stamp()
  try {
  await page.goto('/admin/content/home')
  await page.waitForLoadState('networkidle')
  const field = page.locator('input#home-hero-eyebrow')
  await field.fill(value)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Homepage saved').first()).toBeVisible()
  await expectLive('/', value)
  } finally {
    await bulk([{ page: 'home', section: 'hero', key: 'eyebrow', value: prevEyebrow }])
  }
})

test('home module section (features) is live on /', async () => {
  await page.goto('/')
  const prev = (await adminContent('home')).en?.features?.feature_1_title ?? ''
  const value = stamp()
  await bulk([{ page: 'home', section: 'features', key: 'feature_1_title', value }])
  try {
    await expectLive('/', value)
  } finally {
    await bulk([{ page: 'home', section: 'features', key: 'feature_1_title', value: prev }])
  }
})

test('home Supported Addons heading is live on /', async () => {
  await page.goto('/')
  const prev = (await adminContent('home')).en?.addons?.title ?? ''
  const value = stamp()
  await bulk([{ page: 'home', section: 'addons', key: 'title', value }])
  try {
    await expectLive('/', value)
  } finally {
    await bulk([{ page: 'home', section: 'addons', key: 'title', value: prev }])
  }
})

test('guide intro is live on /guide', async () => {
  await page.goto('/guide')
  const prev = (await adminContent('guide')).en?.intro?.title ?? ''
  const value = stamp()
  await bulk([{ page: 'guide', section: 'intro', key: 'title', value }])
  try {
    await expectLive('/guide', value)
  } finally {
    await bulk([{ page: 'guide', section: 'intro', key: 'title', value: prev }])
  }
})

test('FAQ entry is live on /faq', async () => {
  await page.goto('/faq')
  const question = `${stamp()} question?`
  const created = await json<{ id: number }>(await api.post('/api/v1/admin/faqs', { data: { category: 'general', question, answer: 'E2E answer', isVisible: true } }))
  try {
    await expectLive('/faq', question)
  } finally {
    await json(await api.delete(`/api/v1/admin/faqs/${created.id}`))
  }
})

test('changelog entry is live on /changelog and home Latest', async () => {
  await page.goto('/changelog')
  const version = `v99.${Date.now() % 100000}.0`
  const created = await json<{ id: number }>(await api.post('/api/v1/admin/changelogs', {
    data: { version, content: '- E2E change line', isPublished: true, publishedAt: Math.floor(Date.now() / 1000) + 86400 * 365 },
  }))
  try {
    await expectLive('/changelog', version)
    await expectLive('/', version)
  } finally {
    await json(await api.delete(`/api/v1/admin/changelogs/${created.id}`))
  }
})

test('class layout is live on /strings', async () => {
  await api.get('/api/v1/layouts?view=meta')
  const name = `${stamp()} layout`
  const created = await json<{ id: number }>(await api.post('/api/v1/admin/layouts', {
    data: { name, className: 'Warrior', spec: 'Arms', importString: 'E2E', isVisible: true },
  }))
  try {
    // /strings renders layouts from this SWR-cached public endpoint (class/spec picker, not by name).
    const res = await api.get('/api/v1/layouts?view=meta')
    expect(res.ok()).toBe(true)
    expect(JSON.stringify(await res.json())).toContain(name)
    const html = await page.goto('/strings?tab=layouts&class=Warrior')
    expect(html?.status()).toBe(200)
  } finally {
    await json(await api.delete(`/api/v1/admin/layouts/${created.id}`))
  }
})

test('addon name is live on /addons', async () => {
  await page.goto('/addons')
  const list = await json<Array<{ id: number, name: string, isVisible: boolean, isAvailable: boolean }>>(await api.get('/api/v1/admin/addons'))
  const addon = list.find(a => a.isVisible && a.isAvailable)
  expect(addon, 'a visible addon').toBeTruthy()
  const value = `${addon!.name} ${stamp()}`
  await json(await api.patch(`/api/v1/admin/addons/${addon!.id}`, { data: { name: value } }))
  try {
    await expectLive('/addons', value)
  } finally {
    await json(await api.patch(`/api/v1/admin/addons/${addon!.id}`, { data: { name: addon!.name } }))
  }
})

for (const target of [
  { key: 'about', path: '/about', section: 'intro', field: 'title' },
  { key: 'imprint', path: '/imprint', section: 'operator', field: 'text' },
  { key: 'privacy', path: '/privacy', section: 's2', field: 'title' },
] as const) {
  test(`${target.key} text (Pages form) is live on ${target.path}`, async () => {
    await page.goto(target.path)
    const value = stamp()
    await page.goto(`/admin/content/pages?page=${target.key}`)
    await page.waitForLoadState('networkidle')
    const input = page.locator(`#page-${target.key}-${target.section}-${target.field}`)
    await input.fill(value)
    await page.getByTestId('pages-save').click()
    await expect(page.getByText('Pages saved').first()).toBeVisible()
    await expectLive(target.path, value)
    // Restore: an empty value deletes the row, the page falls back to the default text.
    await bulk([{ page: target.key, section: target.section, key: target.field, value: '' }])
    await page.goto(target.path)
    await expect(page.getByText(value)).toHaveCount(0)
  })
}

test('contact email (Settings) is live on /imprint and /about', async () => {
  await page.goto('/imprint')
  const settings = await json<Record<string, string>>(await api.get('/api/v1/admin/settings'))
  const prev = settings.contact_email ?? ''
  const value = `e2e-${Date.now().toString(36)}@example.com`
  await json(await api.put('/api/v1/admin/settings', { data: { contact_email: value } }))
  try {
    await page.goto('/imprint')
    await expect(page.getByTestId('legal-contact')).toContainText(value)
    await page.goto('/about')
    await expect(page.locator('body')).toContainText(value)
  } finally {
    await json(await api.put('/api/v1/admin/settings', { data: { contact_email: prev } }))
  }
})
