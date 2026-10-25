import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'

/**
 * Item B: admin creates a notice -> it shows on /status (server-rendered) -> timeline update
 * -> resolve -> it moves to the history -> delete. Hostile text must be shown as text.
 * One admin login per run (login is rate-limited); leaves no notice behind.
 */

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'

test.describe.configure({ mode: 'serial' })

let context: BrowserContext
let page: Page
let api: APIRequestContext
let tag = ''
let noticeId = 0

const title = () => `E2E ${tag} <img src=x onerror=window.__xss=1>`
const NOTICE_URL = '/api/v1/admin/status-notices'

async function listed() {
  const res = await api.get(NOTICE_URL)
  expect(res.ok()).toBe(true)
  return (await res.json() as { data: Array<{ id: number, title: string, status: string, updates: unknown[] }> }).data
}

test.beforeAll(async ({ browser }) => {
  tag = Date.now().toString(36)
  context = await browser.newContext()
  page = await context.newPage()
  api = context.request
  const res = await api.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  // Safety net: never leave a test notice on the public page.
  try {
    for (const n of await listed()) if (n.title.startsWith(`E2E ${tag}`)) await api.delete(`${NOTICE_URL}/${n.id}`)
  } catch { /* the context may already be closed */ }
  await context?.close()
})

test('every notice endpoint rejects anonymous requests', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  const calls = [
    await anon.get(NOTICE_URL),
    await anon.post(NOTICE_URL, { data: { kind: 'incident', title: 'x', startsAt: new Date().toISOString() } }),
    await anon.put(`${NOTICE_URL}/1`, { data: { title: 'x' } }),
    await anon.delete(`${NOTICE_URL}/1`),
    await anon.post(`${NOTICE_URL}/1/updates`, { data: { body: 'x' } }),
  ]
  expect(calls.map(r => r.status())).toEqual([401, 401, 401, 401, 401])
  await anon.dispose()
})

test('the admin page loads and ?action=create opens the form', async () => {
  await page.goto('/admin/system/status')
  await expect(page.getByRole('heading', { level: 1, name: 'Status notices' })).toBeVisible()
  await expect(page.getByTestId('notice-new')).toBeVisible()
  await page.goto('/admin/system/status?action=create')
  await expect(page.getByTestId('notice-form')).toBeVisible()
})

test('validation errors are shown, nothing is created', async () => {
  const before = (await listed()).length
  await page.goto('/admin/system/status')
  await page.getByTestId('notice-new').click()
  await page.getByTestId('notice-title').fill(`E2E ${tag} bad window`)
  await page.getByTestId('notice-start').fill('2026-11-02T10:00')
  await page.getByTestId('notice-end').fill('2026-11-02T09:00')
  await page.getByTestId('notice-save').click()
  await expect(page.getByTestId('notice-error')).toContainText(/end must be after the start/i)
  expect((await listed()).length).toBe(before)
})

test('create: the notice appears on /status, hostile text is shown as text', async ({ browser }) => {
  await page.goto('/admin/system/status')
  await page.getByTestId('notice-new').click()
  await page.getByTestId('notice-kind').selectOption('incident')
  await page.getByTestId('notice-component').selectOption('website')
  await page.getByTestId('notice-title').fill(title())
  await page.getByTestId('notice-body').fill('We are **investigating**.\n\nSee [docs](https://example.org) or [bad link](javascript:window.__xss=1) and <script>window.__xss=1</script> inline.\n\n<script>window.__xss=1</script>')
  await expect(page.getByTestId('notice-preview')).toContainText('We are investigating.')
  await page.getByTestId('notice-save').click()
  await expect(page.getByTestId('notice-form')).toBeHidden()

  const mine = (await listed()).find(n => n.title === title())
  expect(mine, 'notice listed').toBeTruthy()
  noticeId = mine!.id
  expect(mine!.status).toBe('in_progress')
  await expect(page.getByTestId(`notice-row-${noticeId}`)).toContainText('Incident · In progress · Website')

  // A visitor with no session sees it, rendered on the server (no JavaScript needed).
  const visitor = await browser.newContext({ javaScriptEnabled: false })
  const pub = await visitor.newPage()
  await pub.goto('/status')
  const box = pub.getByTestId(`status-notice-${noticeId}`)
  await expect(box).toContainText(`E2E ${tag} <img src=x onerror=window.__xss=1>`) // literal text
  await expect(box).toContainText('Incident · In progress · Website')
  await expect(box.locator('strong')).toHaveText('investigating')
  await expect(box.locator('img, script, iframe')).toHaveCount(0)
  await expect(box.locator('a')).toHaveCount(1) // only the https link survives
  await expect(box.locator('a')).toHaveAttribute('href', 'https://example.org')
  await expect(box.locator('a')).toHaveAttribute('rel', /noopener/)
  await expect(box).toContainText('bad link') // kept as text, not as a link
  await visitor.close()

  // With JavaScript on, nothing executes.
  const live = await browser.newContext()
  const pubJs = await live.newPage()
  pubJs.on('dialog', d => d.dismiss())
  await pubJs.goto('/status')
  await expect(pubJs.getByTestId(`status-notice-${noticeId}`)).toBeVisible()
  expect(await pubJs.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  await live.close()
})

test('the endpoint carries only whitelisted notice fields', async ({ request }) => {
  const body = await (await request.get('/api/v1/status')).json() as { data: { notices: Array<Record<string, unknown>>, history: unknown[] } }
  const n = body.data.notices.find(x => x.id === String(noticeId))!
  expect(Object.keys(n).sort()).toEqual(['bodyHtml', 'component', 'endsAt', 'id', 'kind', 'resolvedAt', 'startsAt', 'status', 'title', 'updates'])
  expect(JSON.stringify(body)).not.toMatch(/created_?by|userId|marco|admin@/i)
  expect(String(n.bodyHtml)).not.toMatch(/<(script|img|iframe)/i)
})

test('timeline update, then resolve: it moves to the history with its timeline', async ({ browser }) => {
  await page.goto('/admin/system/status')
  await page.getByTestId(`notice-update-${noticeId}`).click()
  await page.getByTestId('update-status').selectOption('monitoring')
  await page.getByTestId('update-body').fill('A fix is deployed, we are **watching**.')
  await page.getByTestId('update-save').click()
  await expect(page.getByTestId(`notice-row-${noticeId}`)).toContainText('Monitoring')
  await expect(page.getByTestId(`notice-row-${noticeId}`)).toContainText('1 update')

  const visitor = await browser.newContext()
  const pub = await visitor.newPage()
  await pub.goto('/status')
  await expect(pub.getByTestId(`status-notice-${noticeId}-timeline`)).toContainText('A fix is deployed')
  await expect(pub.getByTestId(`status-notice-${noticeId}`)).toContainText('Monitoring')

  // An invalid move is rejected by the server and shown.
  const bad = await api.post(`${NOTICE_URL}/${noticeId}/updates`, { data: { status: 'scheduled' } })
  expect(bad.status()).toBe(422)

  await page.getByTestId(`notice-resolve-${noticeId}`).click()
  await page.getByTestId('update-body').fill('All clear.')
  await page.getByTestId('update-save').click()
  await expect(page.getByTestId(`notice-row-${noticeId}`)).toContainText('Resolved')
  await expect(page.getByTestId(`notice-resolve-${noticeId}`)).toHaveCount(0)

  await pub.goto('/status')
  await expect(pub.getByTestId(`status-notice-${noticeId}`)).toHaveCount(0)
  const hist = pub.getByTestId(`status-history-${noticeId}`)
  await expect(hist).toBeVisible()
  await expect(hist).toContainText('resolved')
  await hist.locator('summary').click()
  const timeline = pub.getByTestId(`status-history-${noticeId}-timeline`)
  await expect(timeline).toContainText('All clear.')
  await expect(timeline).toContainText('A fix is deployed')
  // newest entry first
  await expect(timeline.locator('li').first()).toContainText('All clear.')
  const results = await new AxeBuilder({ page: pub }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
  await visitor.close()
})

test('every write is in the audit log, with the actor and the timeline', async () => {
  const res = await api.get(`/api/v1/admin/audit?type=status_notice&limit=50`)
  expect(res.ok()).toBe(true)
  const items = (await res.json() as { data: { items: Array<{ entityId: number, action: string, actorName: string | null, entityType: string, after: { updates?: unknown[] } | null }> } }).data.items
  const mine = items.filter(i => i.entityId === noticeId)
  expect(mine.map(i => i.action)).toEqual(expect.arrayContaining(['created', 'updated']))
  expect(mine.length).toBeGreaterThanOrEqual(3) // create + two timeline entries
  expect(mine.every(i => i.entityType === 'status_notice' && i.actorName === ADMIN_USER)).toBe(true)
  expect(mine.some(i => (i.after?.updates?.length ?? 0) >= 2)).toBe(true)
})

test('edit and delete: the notice leaves the public page entirely', async ({ browser }) => {
  await page.goto('/admin/system/status')
  await page.getByTestId(`notice-edit-${noticeId}`).click()
  await page.getByTestId('notice-body').fill('Edited description.')
  await page.getByTestId('notice-save').click()
  await expect(page.getByTestId(`notice-row-${noticeId}`)).toContainText('Edited description.')

  await page.getByTestId(`notice-delete-${noticeId}`).click()
  await page.getByTestId('notice-delete-confirm').click()
  await expect(page.getByTestId(`notice-row-${noticeId}`)).toHaveCount(0)

  const visitor = await browser.newContext()
  const pub = await visitor.newPage()
  await pub.goto('/status')
  await expect(pub.getByTestId(`status-history-${noticeId}`)).toHaveCount(0)
  await expect(pub.getByTestId(`status-notice-${noticeId}`)).toHaveCount(0)
  await visitor.close()
  expect((await listed()).some(n => n.id === noticeId)).toBe(false)
})
