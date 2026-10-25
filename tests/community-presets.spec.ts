import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'

/**
 * Item A, community presets: a visitor submits -> it is pending and invisible -> an admin approves
 * -> it shows on /strings with the disclaimer and can be copied -> reject / delete hide it again.
 * Hostile text must render as text. Also checks the server-side defences (honeypot, time-trap,
 * origin, size, duplicates, unknown addon). One admin login per run; leaves nothing behind.
 * The in-memory limiters are relaxed under NUXT_E2E_SEED (see server/utils/communityPresetRuntime.ts).
 */

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'
const ADDON = 'E2E Test Addon'
const API = '/api/v1/community-presets'
const ADMIN_API = '/api/v1/admin/community-presets'

test.describe.configure({ mode: 'serial' })

let context: BrowserContext
let admin: Page
let api: APIRequestContext
let anon: APIRequestContext
let tag = ''
let presetId = 0

const hostile = () => `E2E ${tag} <img src=x onerror=window.__xss=1>`
const presetString = () => `!E2E:${tag}! <script>window.__xss=1</script> ${'Zm9vYmFy'.repeat(8)}`
const mine = (name: string) => name.startsWith(`E2E ${tag}`)

interface Row { id: number, name: string, status: string, note: string, testedVersion: string }
async function queue(): Promise<Row[]> {
  const res = await api.get(ADMIN_API)
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { data: { items: Row[] } }).data.items.filter(r => mine(r.name))
}
async function publicList(): Promise<Array<{ id: number, name: string }>> {
  const res = await anon.get(API)
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { data: Array<{ id: number, name: string }> }).data
}
async function token() {
  const res = await anon.get(`${API}/form-token`)
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { data: { token: string, addons: string[] } }).data
}
const body = (over: Record<string, unknown> = {}) => ({
  name: `E2E ${tag} api`, addon: ADDON, presetString: `!E2E:${tag}:api! ${'QUJDREVG'.repeat(6)}`, note: '', testedVersion: '1.0', website: '', ...over,
})

test.beforeAll(async ({ browser, playwright }) => {
  tag = Date.now().toString(36)
  context = await browser.newContext()
  admin = await context.newPage()
  api = context.request
  anon = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  const res = await api.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  try {
    for (const r of await queue()) await api.delete(`${ADMIN_API}/${r.id}`)
  } catch { /* the context may already be closed */ }
  await anon?.dispose()
  await context?.close()
})

test('every admin endpoint rejects anonymous requests', async () => {
  const calls = [
    await anon.get(ADMIN_API),
    await anon.get(`${ADMIN_API}/1`),
    await anon.patch(`${ADMIN_API}/1`, { data: { status: 'approved' } }),
    await anon.delete(`${ADMIN_API}/1`),
  ]
  expect(calls.map(r => r.status())).toEqual([401, 401, 401, 401])
})

test('server defences: time-trap, honeypot, origin, size, addon, malformed input', async () => {
  test.setTimeout(60_000)
  const [early, trap, origin, big, addon, bad] = await Promise.all([token(), token(), token(), token(), token(), token()])
  expect((await token()).addons).toContain(ADDON)

  // Time-trap: a token used at once is refused, and nothing is stored.
  const tooFast = await anon.post(API, { data: { ...body({ name: `E2E ${tag} fast` }), token: early.token } })
  expect(tooFast.status()).toBe(400)
  expect(await tooFast.text()).toContain('too quickly')

  // A forged token is refused.
  const forged = await anon.post(API, { data: { ...body({ name: `E2E ${tag} forged` }), token: `1700000000.${'a'.repeat(24)}.${'b'.repeat(40)}` } })
  expect(forged.status()).toBe(400)

  await new Promise(r => setTimeout(r, 5500))

  // Honeypot: answers like a success, stores nothing (checked below).
  const honey = await anon.post(API, { data: { ...body({ name: `E2E ${tag} honeypot`, website: 'https://spam.example' }), token: trap.token } })
  expect(honey.status()).toBe(201)

  // Another site cannot post for a visitor.
  const cross = await anon.post(API, { headers: { Origin: 'https://evil.example' }, data: { ...body({ name: `E2E ${tag} cross` }), token: origin.token } })
  expect(cross.status()).toBe(403)

  // Size limits: a huge string is refused before anything is stored.
  const huge = await anon.post(API, { data: { ...body({ name: `E2E ${tag} huge`, presetString: 'x'.repeat(60_000) }), token: big.token } })
  expect(huge.status()).toBe(413)

  // Unknown addon, link in a short field, unknown field.
  const unknown = await anon.post(API, { data: { ...body({ name: `E2E ${tag} unknown`, addon: 'Not An Addon' }), token: addon.token } })
  expect(unknown.status()).toBe(400)
  const later = await Promise.all([token(), token(), token()])
  await new Promise(r => setTimeout(r, 5500))
  const link = await anon.post(API, { data: { ...body({ name: `E2E ${tag} http://evil.example` }), token: later[0]!.token } })
  expect(link.status()).toBe(400)
  const extra = await anon.post(API, { data: { ...body({ name: `E2E ${tag} extra` }), status: 'approved', token: later[1]!.token } })
  expect(extra.status()).toBe(400)
  expect((await anon.post(API, { data: 'not json', headers: { 'content-type': 'application/json' } })).status()).toBe(400)
  void bad

  expect(await queue()).toEqual([])
})

test('a visitor submits through the form; hostile text is stored but never rendered as HTML', async ({ browser }) => {
  test.setTimeout(60_000)
  const visitor = await browser.newContext()
  const page = await visitor.newPage()
  await page.goto('/submit-preset')
  await expect(page.getByRole('heading', { level: 1, name: 'Submit a preset' })).toBeVisible()
  await expect(page.getByTestId('submit-privacy')).toContainText('No account, no cookies')
  await expect(page.getByTestId('preset-addon')).toBeEnabled()

  // Client-side checks come first.
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('submit-error')).toContainText('at least 3 characters')

  await page.getByTestId('preset-name').fill(hostile())
  await page.getByTestId('preset-addon').selectOption(ADDON)
  await page.getByTestId('preset-string').fill(presetString())
  await page.getByTestId('preset-version').fill('1.2.3')
  await page.getByTestId('preset-note').fill('Note <b>bold</b> {{ 7*7 }} [x](javascript:window.__xss=1)')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('submit-success')).toContainText('review queue', { timeout: 20_000 })
  await expect(page.getByTestId('preset-name')).toHaveValue('')
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()

  // The server rejects a bad version with a readable message.
  await page.getByTestId('preset-name').fill(`E2E ${tag} bad version`)
  await page.getByTestId('preset-addon').selectOption(ADDON)
  await page.getByTestId('preset-string').fill(`${presetString()}-2`)
  await page.getByTestId('preset-version').fill('<b>1</b>')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('submit-error')).toContainText(/version/i, { timeout: 20_000 })
  await visitor.close()

  const rows = await queue()
  expect(rows.map(r => r.name)).toEqual([hostile()])
  expect(rows[0]).toMatchObject({ status: 'pending', testedVersion: '1.2.3' })
  presetId = rows[0]!.id
})

test('duplicates answer like a success and do not create a second row', async () => {
  test.setTimeout(30_000)
  const t = await token()
  await new Promise(r => setTimeout(r, 5500))
  const res = await anon.post(API, { data: { ...body({ name: `E2E ${tag} duplicate`, presetString: ` ${presetString()} ` }), token: t.token } })
  expect(res.status()).toBe(201)
  expect((await queue()).length).toBe(1)
  // A token cannot be used twice.
  const again = await anon.post(API, { data: { ...body({ name: `E2E ${tag} replay` }), token: t.token } })
  expect(again.status()).toBe(400)
})

test('pending is hidden everywhere in public', async ({ browser }) => {
  expect((await publicList()).some(p => mine(p.name))).toBe(false)
  expect((await anon.get(`${API}/${presetId}`)).status()).toBe(404)
  const visitor = await browser.newContext()
  const page = await visitor.newPage()
  await page.goto('/strings')
  await expect(page.getByTestId('community-presets')).toBeVisible()
  await expect(page.getByTestId('community-disclaimer')).toContainText('Community-submitted, not verified or endorsed by MagguuUI; import at your own risk')
  await expect(page.getByTestId(`community-item-${presetId}`)).toHaveCount(0)
  await visitor.close()
})

test('the admin sees it as pending, as plain text, and approves it', async () => {
  await admin.goto('/admin/strings/community')
  await expect(admin.getByRole('heading', { level: 1, name: 'Community presets' })).toBeVisible()
  const row = admin.getByTestId(`community-row-${presetId}`)
  await expect(row).toBeVisible()
  await expect(row.getByTestId('community-row-name')).toHaveText(hostile())
  await expect(row.locator('img, script, b')).toHaveCount(0)
  await expect(row).toHaveAttribute('data-status', 'pending')
  await admin.getByTestId(`community-full-${presetId}`).click()
  await expect(admin.getByTestId('community-full-text')).toContainText('<script>window.__xss=1</script>')
  await admin.keyboard.press('Escape')

  // Edit the label first: links are refused, a clean edit sticks.
  await admin.getByTestId(`community-edit-${presetId}`).click()
  await admin.getByTestId('community-edit-name').fill(`E2E ${tag} http://evil.example`)
  await admin.getByTestId('community-edit-save').click()
  await expect(admin.getByTestId('community-edit-error')).toContainText(/links/i)
  await admin.getByTestId('community-edit-name').fill(hostile())
  await admin.getByTestId('community-edit-version').fill('1.2.4')
  await admin.getByTestId('community-edit-save').click()
  await expect(row).toContainText('tested with version 1.2.4')

  await admin.getByTestId(`community-approve-${presetId}`).click()
  await admin.getByTestId('community-filter-approved').click()
  await expect(admin.getByTestId(`community-row-${presetId}`)).toHaveAttribute('data-status', 'approved')
  expect(await admin.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})

for (const mode of ['dark', 'light'] as const) {
  test(`approved: listed on /strings with the disclaimer, copy works, axe is clean (${mode})`, async ({ browser }) => {
    const visitor = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await visitor.newPage()
    await page.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), mode)
    await page.goto('/strings')
    const item = page.getByTestId(`community-item-${presetId}`)
    await expect(item).toBeVisible()
    await expect(item.getByTestId('community-name')).toHaveText(hostile())
    await expect(item.getByTestId('community-meta')).toHaveText(`${ADDON} · Tested with ${ADDON} version 1.2.4`)
    await expect(item.getByTestId('community-note')).toHaveText('Note <b>bold</b> {{ 7*7 }} [x](javascript:window.__xss=1)')
    await expect(item.locator('img, script, b, a')).toHaveCount(0)
    await expect(page.getByTestId('community-disclaimer')).toContainText('Community-submitted, not verified or endorsed by MagguuUI; import at your own risk')
    await expect(page.getByTestId('community-presets')).not.toContainText('Official')
    await expect(page.getByTestId('community-submit-link')).toHaveAttribute('href', '/submit-preset')

    // Axe before the click: while it says "Copied" the visible text differs from the accessible name by design.
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])

    await item.getByRole('button', { name: /Copy community preset/ }).click()
    await expect(item.getByRole('button', { name: /Copy community preset|Copied/ })).toContainText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(presetString())
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()

    await visitor.close()
  })

  test(`form page passes axe and is not indexable (${mode})`, async ({ browser }) => {
    const visitor = await browser.newContext()
    const page = await visitor.newPage()
    await page.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), mode)
    const res = await page.goto('/submit-preset')
    expect(res?.headers()['x-robots-tag']).toContain('noindex')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.getByTestId('preset-addon')).toBeEnabled()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
    // No cookie is set by visiting or reading the form.
    expect((await visitor.cookies()).map(c => c.name)).toEqual(['mg_consent']) // the stored "necessary only" choice from playwright.config.ts, nothing new
    await visitor.close()
  })
}

test('the admin queue passes axe in both themes', async () => {
  for (const mode of ['dark', 'light']) {
    await admin.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), mode)
    await admin.goto('/admin/strings/community?status=all')
    await expect(admin.getByTestId(`community-row-${presetId}`)).toBeVisible()
    const results = await new AxeBuilder({ page: admin }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
  }
})

test('the public list is whitelisted and the privacy page describes submissions', async ({ page }) => {
  const list = await publicList()
  const item = list.find(p => p.id === presetId)!
  expect(Object.keys(item).sort()).toEqual(['addon', 'id', 'name', 'note', 'stringLength', 'testedVersion'])
  await page.goto('/privacy')
  await expect(page.getByTestId('privacy-s8')).toContainText('Community Preset Submissions')
  await expect(page.getByTestId('privacy-s8')).toContainText('30 days')
  await expect(page.getByTestId('privacy-s7')).toContainText('approved community preset')
  await expect(page.getByTestId('privacy-s9')).toContainText('Backups of the database')
  await expect(page.getByTestId('privacy-s10')).toContainText('Article 6(1)(a) GDPR')
  await expect(page.getByTestId('privacy-s11')).toContainText('mg_vid')
  await expect(page.getByTestId('privacy-s12')).toContainText('13 months')
  await expect(page.getByTestId('privacy-s12')).toContainText('Cloudflare Tunnel')
})

test('every change is audited, without the string', async () => {
  const res = await api.get('/api/v1/admin/audit?type=community_preset&limit=50')
  expect(res.ok()).toBe(true)
  const items = (await res.json() as { data: { items: Array<{ entityId: number, action: string, actorName: string | null, after: Record<string, unknown> | null }> } }).data.items
  const rows = items.filter(i => i.entityId === presetId)
  expect(rows.length).toBeGreaterThanOrEqual(2) // label edit + approval
  expect(rows.every(i => i.actorName === ADMIN_USER)).toBe(true)
  expect(JSON.stringify(rows)).not.toContain(`!E2E:${tag}!`)
})

test('reject hides it again, delete removes it for good', async () => {
  await admin.goto('/admin/strings/community?status=approved')
  await admin.getByTestId(`community-reject-${presetId}`).click()
  await expect(admin.getByTestId(`community-row-${presetId}`)).toHaveCount(0)
  expect((await publicList()).some(p => p.id === presetId)).toBe(false)
  expect((await anon.get(`${API}/${presetId}`)).status()).toBe(404)

  await admin.getByTestId('community-filter-rejected').click()
  await expect(admin.getByTestId(`community-row-${presetId}`)).toHaveAttribute('data-status', 'rejected')
  await admin.getByTestId(`community-delete-${presetId}`).click()
  await admin.getByTestId('community-delete-confirm').click()
  await expect(admin.getByTestId(`community-row-${presetId}`)).toHaveCount(0)
  expect(await queue()).toEqual([])
})
