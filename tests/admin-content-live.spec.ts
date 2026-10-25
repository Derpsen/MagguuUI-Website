import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
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

/** Leftover drafts would leak into later specs: drop them. */
async function discardDrafts(...pages: string[]) {
  await json(await api.delete(`/api/v1/admin/content/drafts?pages=${pages.join(',')}`))
}

async function publicContent(pageKey: string) {
  return JSON.stringify(await json(await api.get(`/api/v1/content/${pageKey}`)))
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

test('admin dashboard: site-data overview with drafts, counts and recent changes (no cards, no secrets)', async () => {
  test.setTimeout(90_000)
  const tag = stamp()
  let faqId = 0
  try {
    faqId = (await json<{ id: number }>(await api.post('/api/v1/admin/faqs', { data: { category: 'general', question: `Dash ${tag}`, answer: 'Answer' } }))).id
    await json(await api.post('/api/v1/admin/content/drafts', { data: { pages: ['about'], items: [{ page: 'about', section: 'intro', key: 'title', locale: 'en', value: `Draft ${tag}` }] } }))

    // The API: one endpoint, fresh bypasses the short cache, no snapshots or secrets.
    const overview = await json<{ drafts: { cells: number, pages: string[] }, recent: Array<{ entityName: string }>, counts: { faqTotal: number }, health: { database: string } }>(await api.get('/api/v1/admin/overview?fresh=1'))
    expect(overview.drafts.pages).toContain('about')
    expect(overview.drafts.cells).toBeGreaterThan(0)
    expect(overview.counts.faqTotal).toBeGreaterThan(0)
    expect(overview.health.database).toBe('ok')
    expect(overview.recent.map(r => r.entityName)).toContain(`Dash ${tag}`)
    const raw = JSON.stringify(overview).toLowerCase()
    for (const word of ['password', 'before_json', 'beforejson', 'token', 'webhook']) expect(raw).not.toContain(word)

    await page.goto('/admin')
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('admin-dash-refresh').click()
    await expect(page.getByTestId('dash-attention-drafts')).toContainText('unpublished draft', { timeout: 15_000 })
    await expect(page.getByTestId('dash-attention-drafts')).toContainText('about')
    for (const id of ['dash-content', 'dash-publishing', 'dash-traffic', 'dash-health', 'dash-recent']) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    await expect(page.getByTestId('dash-count-faq')).toBeVisible()
    await expect(page.getByTestId('dash-db')).toContainText('ok')
    await expect(page.getByTestId('dash-latest-version')).toContainText(/v\d|none/)
    await expect(page.getByTestId('dash-recent')).toContainText(`Dash ${tag}`)
    await expect(page.getByTestId('dash-last-change')).not.toContainText('none yet')

    // Plain sections: no card boxes on the dashboard.
    expect(await page.locator('[data-testid="admin-dashboard"] [class*="rounded-xl"], [data-testid="admin-dashboard"] .admin-metric-card').count()).toBe(0)
  } finally {
    await discardDrafts('about')
    if (faqId) await api.delete(`/api/v1/admin/faqs/${faqId}`)
  }
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
  await page.getByTestId('home-save').click()
  await expect(page.getByText('Draft saved').first()).toBeVisible()
  // A draft is not public until it is published.
  expect(await publicContent('home')).not.toContain(value)
  await page.getByTestId('draft-publish').click()
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()
  await expectLive('/', value)
  } finally {
    await discardDrafts('home')
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
    await expect(page.getByText('Draft saved').first()).toBeVisible()
    expect(await publicContent(target.key)).not.toContain(value)
    await page.getByTestId('draft-publish').click()
    await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()
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

test('review changes before saving, then restore from history (home eyebrow)', async () => {
  const prev = (await adminContent('home')).en?.hero?.eyebrow ?? ''
  const value = stamp()
  try {
    await page.goto('/admin/content/home')
    await page.waitForLoadState('networkidle')
    await page.locator('input#home-hero-eyebrow').fill(value)
    await page.getByTestId('home-review').click()
    const preview = page.getByTestId('change-preview')
    await expect(preview).toBeVisible()
    await expect(preview).toContainText('hero · eyebrow')
    await expect(preview).toContainText(value)
    await page.getByTestId('change-preview-save').click()
    await expect(page.getByText('Draft saved').first()).toBeVisible()
    await page.getByTestId('draft-publish').click()
    await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()
    await expectLive('/', value)

    // The previous eyebrow is now a revision; restoring it puts it back live.
    await page.goto('/admin/content/home')
    const history = page.getByTestId('content-history')
    await expect(history).toBeVisible({ timeout: 15_000 })
    await history.getByTestId('content-history-restore').first().click()
    await expect(page.getByText('Restored').first()).toBeVisible()
    const after = (await adminContent('home')).en?.hero?.eyebrow ?? ''
    expect(after).toBe(prev)
  } finally {
    await discardDrafts('home')
    await bulk([{ page: 'home', section: 'hero', key: 'eyebrow', value: prev }])
  }
})

test('Pages draft: live preview shows it, the public site does not, Publish promotes it, Discard drops it', async () => {
  test.setTimeout(120_000)
  const value = stamp()
  const second = `${stamp()} second`
  try {
    await page.goto('/about')
    await page.goto('/admin/content/pages?page=about')
    await page.waitForLoadState('networkidle')
    const input = page.locator('#page-about-intro-title')
    await expect(page.getByTestId('draft-bar')).toHaveCount(0)

    // Typing updates the live preview (the public About component) before anything is saved.
    await input.fill(value)
    await expect(page.getByTestId('pages-preview')).toContainText(value)
    await expect(page.getByTestId('draft-bar')).toContainText('not saved as a draft')

    await page.getByTestId('pages-save').click()
    await expect(page.getByText('Draft saved').first()).toBeVisible()
    await expect(page.getByTestId('draft-status')).toContainText('1 field differs')

    // Draft is invisible to visitors, feeds, search and the public content API.
    expect(await publicContent('about')).not.toContain(value)
    const publicPage = await (await context.browser()!.newContext()).newPage()
    try {
      await publicPage.goto('/about')
      await expect(publicPage.locator('body')).not.toContainText(value)
      for (const url of ['/api/v1/search-index', '/sitemap.xml', '/api/v1/content/about']) {
        const res = await publicPage.request.get(url)
        expect(await res.text(), url).not.toContain(value)
      }

      // The draft survives a reload and is still unpublished.
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(input).toHaveValue(value)
      await expect(page.getByTestId('draft-status')).toContainText('1 field differs')

      // Publish: now public.
      await page.getByTestId('draft-publish').click()
      await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()
      await expect(page.getByTestId('draft-bar')).toHaveCount(0)
      await publicPage.goto('/about')
      await expect(publicPage.locator('body')).toContainText(value)

      // A second draft, discarded: the form returns to the live text and the public page is unchanged.
      // The editor reloads after Publish: wait for the fresh form before typing.
      await expect(page.getByText('Loading page content.')).toHaveCount(0)
      await expect(input).toHaveValue(value)
      await input.fill(second)
      await page.getByTestId('pages-save').click()
      await expect(page.getByTestId('draft-status')).toContainText('1 field differs')
      await page.getByTestId('draft-discard').click()
      await page.getByTestId('draft-discard-confirm').click()
      await expect(page.getByText('Draft discarded').first()).toBeVisible()
      await expect(input).toHaveValue(value)
      await expect(page.getByTestId('draft-bar')).toHaveCount(0)
      await publicPage.goto('/about')
      await expect(publicPage.locator('body')).not.toContainText(second)
    } finally {
      await publicPage.context().close()
    }
  } finally {
    await discardDrafts('about')
    await bulk([{ page: 'about', section: 'intro', key: 'title', value: '' }])
  }
})

test('Audit log: diff, Undo restores, newer edits block Undo, secrets are never stored', async () => {
  test.setTimeout(120_000)
  const tag = stamp()
  const secret = `E2Esecret${Date.now().toString(36)}`
  type Entry = { id: number, action: string, entityType: string, undoable: boolean, before: Record<string, unknown> | null, after: Record<string, unknown> | null }
  const audit = async (search: string) => (await json<{ items: Entry[] }>(await api.get(`/api/v1/admin/audit?search=${encodeURIComponent(search)}`))).items
  let faqId = 0
  try {
    const created = await json<{ id: number }>(await api.post('/api/v1/admin/faqs', { data: { category: 'general', question: `Audit ${tag}`, answer: 'First answer' } }))
    faqId = created.id
    await json(await api.put(`/api/v1/admin/faqs/${faqId}`, { data: { answer: 'Second answer' } }))

    let entries = await audit(tag)
    expect(entries.map(e => e.action)).toEqual(['updated', 'created'])
    const updated = entries[0]!

    // Readable diff in the admin page.
    await page.goto('/admin/system/audit')
    await page.getByTestId('audit-search').fill(tag)
    await expect(page.getByTestId(`audit-entry-${updated.id}`)).toBeVisible()
    await page.getByTestId(`audit-toggle-${updated.id}`).click()
    const diff = page.getByTestId(`audit-diff-${updated.id}`)
    await expect(diff.locator('[data-diff="del"]', { hasText: 'First answer' })).toBeVisible()
    await expect(diff.locator('[data-diff="add"]', { hasText: 'Second answer' })).toBeVisible()

    // Undo (with confirmation) restores the before-state as a new audited action.
    await page.getByTestId(`audit-undo-${updated.id}`).click()
    await page.getByTestId(`audit-undo-confirm-${updated.id}`).click()
    await expect(page.getByText('Restored', { exact: true }).first()).toBeVisible()
    const faqs = await json<Array<{ id: number, answer: string }>>(await api.get('/api/v1/admin/faqs'))
    expect(faqs.find(f => f.id === faqId)?.answer).toBe('First answer')
    entries = await audit(tag)
    expect(entries[0]!.entityType).toBe('faq')
    expect(entries.find(e => e.id === updated.id)!.undoable).toBe(false)

    // A newer edit blocks the undo of an older one (409), and nothing changes.
    await json(await api.put(`/api/v1/admin/faqs/${faqId}`, { data: { answer: 'Third answer' } }))
    await json(await api.put(`/api/v1/admin/faqs/${faqId}`, { data: { answer: 'Fourth answer' } }))
    const [fourth, third] = (await audit(tag)).filter(e => e.action === 'updated' && e.undoable)
    const blocked = await api.post(`/api/v1/admin/audit/${third!.id}/undo`)
    expect(blocked.status()).toBe(409)
    expect(fourth!.id).toBeGreaterThan(third!.id)
    const still = await json<Array<{ id: number, answer: string }>>(await api.get('/api/v1/admin/faqs'))
    expect(still.find(f => f.id === faqId)?.answer).toBe('Fourth answer')

    // Content publish is audited and undoable.
    const value = `${tag} content`
    await bulk([{ page: 'about', section: 'intro', key: 'title', value }])
    const contentEntry = (await audit(value))[0]!
    expect(contentEntry.entityType).toBe('content')
    await json(await api.post(`/api/v1/admin/audit/${contentEntry.id}/undo`))
    expect(await publicContent('about')).not.toContain(value)

    // Secrets never reach the log: a webhook URL written through Settings is redacted.
    await json(await api.put('/api/v1/admin/settings', { data: { e2e_audit_webhook_url: `https://discord.com/api/webhooks/1/${secret}` } }))
    const raw = await (await api.get('/api/v1/admin/audit?type=setting&limit=100')).text()
    expect(raw).not.toContain(secret)
    expect(raw).toContain('[redacted]')
  } finally {
    await api.put('/api/v1/admin/settings', { data: { e2e_audit_webhook_url: '' } })
    await bulk([{ page: 'about', section: 'intro', key: 'title', value: '' }])
    if (faqId) await api.delete(`/api/v1/admin/faqs/${faqId}`)
  }
})

test('admin Web Vitals view lists beaconed p75 per page', async () => {
  const beacon = JSON.stringify({ path: '/faq', metrics: [{ name: 'LCP', value: 1234 }, { name: 'CLS', value: 0.02 }] })
  const res = await page.request.post('/api/v1/vitals', { data: beacon, headers: { 'content-type': 'text/plain' } })
  expect(res.status()).toBe(204)
  await page.goto('/admin/system/vitals')
  await expect(page.getByTestId('vitals-table')).toBeVisible({ timeout: 15_000 })
  const row = page.getByTestId('vitals-table').getByRole('row', { name: /\/faq/ })
  await expect(row).toContainText('ms')
})

test.describe('admin command palette (Ctrl/Cmd+K)', () => {
  const palette = () => page.getByTestId('admin-command')
  const box = () => page.getByRole('combobox', { name: 'Search admin pages and actions' })

  test.beforeEach(async () => {
    await page.goto('/admin/system/fields')
    await expect(page.getByRole('button', { name: 'Open command palette' }).first()).toBeAttached({ timeout: 30_000 })
    await page.waitForLoadState('networkidle')
  })

  for (const combo of ['Control+k', 'Meta+k']) {
    test(`${combo} opens a labelled combobox/listbox and Esc closes it`, async () => {
      await page.keyboard.press(combo)
      await expect(palette()).toBeVisible()
      await expect(box()).toBeFocused()
      await expect(box()).toHaveAttribute('aria-controls', 'admin-command-list')
      await expect(page.getByRole('listbox', { name: 'Pages and actions' })).toBeVisible()
      await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('Escape')
      await expect(palette()).toHaveCount(0)
      // The same shortcut toggles it again.
      await page.keyboard.press(combo)
      await expect(palette()).toBeVisible()
      await page.keyboard.press(combo)
      await expect(palette()).toHaveCount(0)
    })
  }

  test('typing filters, arrows move the active option, Enter navigates', async () => {
    await page.keyboard.press('Control+k')
    await box().fill('api keys')
    await expect(page.getByRole('option').first()).toContainText('API Keys')
    const n = await page.getByRole('option').count()
    await expect(page.getByRole('status').filter({ hasText: 'result' })).toHaveText(`${n} ${n === 1 ? 'result' : 'results'}`)
    await box().fill('settings')
    const count = await page.getByRole('option').count()
    expect(count).toBeGreaterThan(2)
    await page.keyboard.press('ArrowDown')
    const active = await box().getAttribute('aria-activedescendant')
    expect(active).toBe('admin-command-list-opt-1')
    await expect(page.locator(`#${active}`)).toHaveAttribute('aria-selected', 'true')
    await box().fill('security')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/admin\/system\/settings\?tab=security/)
    await expect(palette()).toHaveCount(0)
  })

  test('a query with no match shows an empty state', async () => {
    await page.keyboard.press('Control+k')
    await box().fill('zzzzqqq')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(palette()).toContainText('No results')
  })

  test('Tab stays inside the dialog (focus trap) and focus returns to the trigger after Esc', async () => {
    const trigger = page.getByRole('button', { name: 'Open command palette' }).filter({ visible: true }).first()
    await trigger.click()
    await expect(palette()).toBeVisible()
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(palette()).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('toggle theme and open public website actions work', async () => {
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    await page.keyboard.press('Control+k')
    await box().fill('theme')
    await expect(page.getByRole('option').first()).toContainText(before ? 'Switch to light mode' : 'Switch to dark mode')
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before)
    // put it back
    await page.keyboard.press('Control+k')
    await box().fill('theme')
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(before)
    await page.keyboard.press('Control+k')
    await box().fill('public website')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/$/)
  })

  test('the Log out action is offered but not run by browsing', async () => {
    await page.keyboard.press('Control+k')
    await box().fill('log out')
    await expect(page.getByRole('option').first()).toContainText('Log out')
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/admin\/system\/fields/)
  })
})

test.describe('profile previews (/profiles)', () => {
  const PREVIEW_DIR = join(process.cwd(), 'public', 'previews')
  // 1×1 lossless WebP: a real, decodable image for the browser.
  const TINY_WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
  let profileId = 0
  const profileName = `Preview ${Date.now().toString(36)}`
  let wroteFile = ''

  type PreviewItem = { slug: string, profiles: string[], image: { src: string } | null }
  const previews = async () => json<PreviewItem[]>(await api.get(`/api/v1/profile-previews?t=${Date.now()}`))

  test.afterAll(async () => {
    if (wroteFile) rmSync(wroteFile, { force: true })
    if (profileId) await api.delete(`/api/v1/admin/profiles/${profileId}`)
  })

  test('a visible profile shows up with a placeholder, a dropped-in file replaces it, hiding removes it', async () => {
    const created = await json<{ id: number }>(await api.post('/api/v1/admin/profiles', { data: { addon: 'EllesmereUI', profile: profileName, string: 'e2e-preview', isVisible: true } }))
    profileId = created.id

    // Placeholder first (only when no real screenshot has been committed yet).
    const existingFile = existsSync(PREVIEW_DIR) && readdirSync(PREVIEW_DIR).some(f => /^ellesmereui\.(webp|avif|png|jpe?g)$/i.test(f))
    let item = (await previews()).find(i => i.slug === 'ellesmereui')
    expect(item?.profiles).toContain(profileName)
    await page.goto(`/profiles?e2e=${Date.now()}`)
    const card = page.getByTestId('profile-preview-ellesmereui')
    await expect(card.getByTestId('profile-preview-names')).toContainText(profileName)

    if (!existingFile) {
      expect(item?.image).toBeNull()
      await expect(card.getByTestId('profile-preview-placeholder')).toContainText('Preview image to be added')
      await expect(card.locator('img')).toHaveCount(0)

      // Drop a file in: the same page now renders it, with dimensions and alt text.
      mkdirSync(PREVIEW_DIR, { recursive: true })
      wroteFile = join(PREVIEW_DIR, 'ellesmereui.webp')
      writeFileSync(wroteFile, TINY_WEBP)
      item = (await previews()).find(i => i.slug === 'ellesmereui')
      expect(item?.image?.src).toBe('/previews/ellesmereui.webp')
      await page.goto(`/profiles?e2e=${Date.now()}`)
      const img = page.getByTestId('profile-preview-ellesmereui').locator('img')
      await expect(img).toHaveAttribute('src', '/previews/ellesmereui.webp')
      await expect(img).toHaveAttribute('width', '1600')
      await expect(img).toHaveAttribute('height', '1000')
      await expect(img).toHaveAttribute('alt', /EllesmereUI/)
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1)

      // Remove the file again: back to the placeholder.
      rmSync(wroteFile, { force: true })
      wroteFile = ''
      expect((await previews()).find(i => i.slug === 'ellesmereui')?.image).toBeNull()
    }

    // Unpublished profiles never appear publicly.
    await json(await api.patch(`/api/v1/admin/profiles/${profileId}`, { data: { isVisible: false } }))
    const hidden = (await previews()).find(i => i.slug === 'ellesmereui')
    expect(hidden?.profiles ?? []).not.toContain(profileName)
    expect(JSON.stringify(await previews())).not.toContain('e2e-preview')
  })
})

test.describe('profile configurator (/configurator)', () => {
  const s = Date.now().toString(36)
  const nameA = `Cfg A ${s}`
  const nameB = `Cfg B ${s}`
  const profileIds: number[] = []
  const packIds: number[] = []
  let hiddenId = 0

  const b64 = (names: string[]) => Buffer.from(JSON.stringify({ addons: names.map(name => ({ name })) })).toString('base64')

  test.beforeAll(async () => {
    const make = async (addon: string, profile: string, string: string) =>
      profileIds.push((await json<{ id: number }>(await api.post('/api/v1/admin/profiles', { data: { addon, profile, string } }))).id)
    await make('BigWigs', nameA, 'e2e-cfg-bigwigs-a')
    await make('BigWigs', nameB, 'e2e-cfg-bigwigs-b')
    await make('GTFO', `Cfg G ${s}`, 'e2e-cfg-gtfo')
    hiddenId = profileIds[1]!
    // Starter/Optional collections: only created when the dev DB has none (and removed again).
    const existing = await json<Record<string, unknown>>(await api.get('/api/v1/wowup?view=meta'))
    const packs: Array<[string, string[]]> = [['Required', ['EllesmereUI', 'MagguuUI', 'BigWigs (Boss Timers & Tools)']], ['Optional', ['GTFO', 'Auctionator']]]
    for (const [name, names] of packs) {
      if (existing[name]) continue
      packIds.push((await json<{ id: number }>(await api.post('/api/v1/admin/wowup', { data: { name, string: b64(names) } }))).id)
    }
  })

  test.afterAll(async () => {
    for (const id of profileIds) await api.delete(`/api/v1/admin/profiles/${id}`)
    for (const id of packIds) await api.delete(`/api/v1/admin/wowup/${id}`)
  })

  test('public data carries no import strings and only published rows', async () => {
    const body = JSON.stringify(await json(await api.get('/api/v1/configurator')))
    expect(body).toContain(nameA)
    expect(body).not.toContain('e2e-cfg-')
  })

  test('selection in the URL drives packs, profile strings and the honest in-game notes', async () => {
    await page.goto(`/configurator?addons=bigwigs,gtfo&exclude=${encodeURIComponent(`bigwigs:${nameB}`)}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Profile configurator' })).toBeVisible()
    const ellesmere = page.getByRole('checkbox', { name: 'EllesmereUI', exact: true })
    await expect(ellesmere).toBeChecked()
    await expect(ellesmere).toBeDisabled()
    await expect(page.getByRole('checkbox', { name: 'BigWigs', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: nameA })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: nameB })).not.toBeChecked()

    const bigwigs = page.getByTestId('cfg-profile-bigwigs')
    await expect(bigwigs).toContainText(nameA)
    await expect(bigwigs).not.toContainText(nameB)
    await expect(bigwigs).toContainText('Single import in Setup')
    await expect(page.getByTestId('cfg-profile-gtfo')).toContainText('No single import button')
    await expect(page.getByTestId('cfg-pack-starter')).toContainText('BigWigs')
    await expect(page.getByTestId('cfg-pack-optional')).toContainText('GTFO')
    const ingame = page.getByTestId('cfg-ingame')
    await expect(ingame).toContainText('Apply Magguu profiles')
    await expect(ingame).toContainText('You cannot pick modules there')
    await expect(page.getByTestId('cfg-addon-list')).toContainText('GTFO')
    await expect(page.locator('body')).not.toContainText(/naowh/i)
  })

  test('checkboxes work with the keyboard, update the URL and survive a reload', async () => {
    await page.goto('/configurator')
    await page.waitForLoadState('networkidle') // hydrated
    expect(new URL(page.url()).search).toBe('')
    const gtfo = page.getByRole('checkbox', { name: 'GTFO', exact: true })
    await expect(gtfo).not.toBeChecked()
    await gtfo.focus()
    await page.keyboard.press('Space')
    await expect(gtfo).toBeChecked()
    await expect.poll(() => new URL(page.url()).searchParams.get('addons')).toBe('gtfo')
    await expect(page.getByTestId('cfg-profile-gtfo')).toBeVisible()
    await page.reload()
    await page.waitForLoadState('networkidle') // hydrated again
    await expect(page.getByRole('checkbox', { name: 'GTFO', exact: true })).toBeChecked()
    await expect(page.getByTestId('cfg-profile-gtfo')).toBeVisible()
    await page.getByRole('checkbox', { name: 'GTFO', exact: true }).press('Space')
    await expect.poll(() => new URL(page.url()).searchParams.has('addons')).toBe(false)
    await expect(page.getByTestId('cfg-profile-gtfo')).toHaveCount(0)

    // Per-profile choice appears for addons with several profiles.
    await page.getByRole('checkbox', { name: 'BigWigs', exact: true }).check()
    await page.getByRole('checkbox', { name: nameB }).uncheck()
    await expect.poll(() => new URL(page.url()).searchParams.get('exclude')).toBe(`bigwigs:${nameB}`)
    await page.getByRole('checkbox', { name: nameB }).check()
    await expect.poll(() => new URL(page.url()).searchParams.has('exclude')).toBe(false)
  })

  test('copy buttons put the real string on the clipboard', async () => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/configurator?addons=bigwigs')
    await page.waitForLoadState('networkidle')
    const copyA = page.getByRole('button', { name: `Copy string: BigWigs, ${nameA}` })
    await copyA.click()
    await expect(copyA).toHaveText('Copied')
    await expect(page.getByRole('status').filter({ hasText: 'Copied to clipboard' })).toHaveCount(1)
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('e2e-cfg-bigwigs-a')
    await page.getByRole('button', { name: 'Copy list: addons to install' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('EllesmereUI\nBigWigs')
  })

  test('an unpublished profile never shows up', async () => {
    await json(await api.patch(`/api/v1/admin/profiles/${hiddenId}`, { data: { isVisible: false } }))
    await page.goto('/configurator?addons=bigwigs')
    await expect(page.getByTestId('cfg-profile-bigwigs')).toContainText(nameA)
    await expect(page.locator('body')).not.toContainText(nameB)
  })
})

test.describe('anonymous counting (/privacy, admin Routes view)', () => {
  // Counts are told apart from other specs' traffic (same IP) by a referrer host that is unique to each check.
  const HUMAN_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
  const s = Date.now().toString(36)
  const host = (n: string) => `${n}-${s}.example.org`
  const from = (n: string) => `https://${host(n)}/`
  let profileId = 0
  let anon: BrowserContext

  type Traffic = {
    totals: { views: number, copies: number }
    routes: Array<{ path: string, views: number }>
    referrers: Array<{ name: string, views: number }>
    copied: Array<{ type: string, id: number, copies: number }>
  }
  const traffic = async () => json<Traffic>(await api.get('/api/v1/admin/stats/traffic?days=7'))
  const viaHost = async (n: string) => (await traffic()).referrers.find(r => r.name === host(n))?.views ?? 0
  const copies = async () => (await traffic()).copied.find(c => c.type === 'profile' && c.id === profileId)?.copies ?? 0
  const beaconSeen = (p: Page) => p.waitForResponse(r => r.url().includes('/api/v1/page-view'))
  const settle = (p: Page) => p.waitForTimeout(400)
  const post = (ctx: BrowserContext, path: string, n: string) =>
    ctx.request.post('/api/v1/page-view', { data: { path, referrer: from(n) } })

  test.beforeAll(async ({ browser }) => {
    profileId = (await json<{ id: number }>(await api.post('/api/v1/admin/profiles', { data: { addon: 'BigWigs', profile: `Count ${s}`, string: 'e2e-count' } }))).id
    anon = await browser.newContext({ userAgent: HUMAN_UA })
    await anon.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test.afterAll(async () => {
    await anon?.close()
    await api.delete(`/api/v1/admin/profiles/${profileId}`)
  })

  test('a visitor sets no cookie and the privacy page describes the counting', async () => {
    const res = await anon.request.get('/')
    expect(res.headers()['set-cookie']).toBeUndefined()
    const p = await anon.newPage()
    await p.goto('/privacy')
    await expect(p.getByRole('heading', { name: '7. Anonymous Usage Counting' })).toBeVisible()
    await expect(p.locator('body')).toContainText('No cookies')
    await expect(p.locator('body')).toContainText('deleted after 14 days')
    await p.close()
    expect((await anon.cookies()).length).toBe(0)
    const stored = await anon.storageState()
    expect(JSON.stringify(stored.origins)).not.toMatch(/visitor|session|uuid/i)
  })

  test('a page view is counted once per visit, without query or admin paths', async () => {
    const p = await anon.newPage()
    await Promise.all([beaconSeen(p), p.goto('/faq?utm_source=e2e#top', { referer: from('view') })])
    await expect.poll(() => viaHost('view')).toBe(1)
    await settle(p)
    expect(await viaHost('view')).toBe(1)
    const t = await traffic()
    expect(t.routes.some(r => r.path.includes('?') || r.path.startsWith('/admin'))).toBe(false)
    await p.close()
  })

  test('Do Not Track and Global Privacy Control skip counting (client and server)', async ({ browser }) => {
    // Server side: the header alone is enough, even for a hand-made request.
    const withDnt = await browser.newContext({ userAgent: HUMAN_UA, extraHTTPHeaders: { DNT: '1' } })
    expect((await post(withDnt, '/guide', 'dnt')).status()).toBe(204)
    const withGpc = await browser.newContext({ userAgent: HUMAN_UA, extraHTTPHeaders: { 'Sec-GPC': '1' } })
    expect((await post(withGpc, '/guide', 'dnt')).status()).toBe(204)
    // Client side: the browser signal stops the beacon from being sent at all.
    const signal = await browser.newContext({ userAgent: HUMAN_UA })
    await signal.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { value: '1' }))
    const p = await signal.newPage()
    let sent = 0
    p.on('request', (r) => { if (r.url().includes('/api/v1/page-view')) sent++ })
    await p.goto('/guide', { referer: from('dnt') })
    await p.waitForLoadState('networkidle')
    await settle(p)
    expect(sent).toBe(0)
    await Promise.all([withDnt.close(), withGpc.close(), signal.close()])
    // Control: the same request without the signal is counted.
    expect((await post(anon, '/guide', 'dnt')).status()).toBe(204)
    await expect.poll(() => viaHost('dnt')).toBe(1)
  })

  test('bots, admin sessions and unknown paths are not counted', async ({ browser }) => {
    const bot = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })
    const bp = await bot.newPage()
    await Promise.all([beaconSeen(bp), bp.goto('/about', { referer: from('skip') })])
    await bot.close()
    // The logged-in admin session (this spec's `page`) sends the beacon but is ignored by the server.
    await Promise.all([beaconSeen(page), page.goto('/about', { referer: from('skip') })])
    await settle(page)
    // Anonymous but outside the allowlist.
    for (const path of ['/admin/users', '/nope', '/api/v1/health']) {
      expect((await post(anon, path, 'skip')).status()).toBe(204)
    }
    // Control: a normal visitor is counted, nothing before it was.
    expect((await post(anon, '/about', 'skip')).status()).toBe(204)
    await expect.poll(() => viaHost('skip')).toBe(1)
    await settle(page)
    expect(await viaHost('skip')).toBe(1)
  })

  test('a copy click is counted for a published item only', async () => {
    const before = await copies()
    const p = await anon.newPage()
    await p.goto('/configurator?addons=bigwigs')
    await p.waitForLoadState('networkidle')
    await p.getByRole('button', { name: `Copy string: BigWigs, Count ${s}` }).click()
    await expect.poll(copies).toBe(before + 1)
    await p.close()

    await json(await api.patch(`/api/v1/admin/profiles/${profileId}`, { data: { isVisible: false } }))
    expect((await anon.request.post('/api/v1/copy-event', { data: { type: 'profile', id: profileId } })).status()).toBe(204)
    expect((await anon.request.post('/api/v1/copy-event', { data: { type: 'bogus', id: 1 } })).status()).toBe(204)
    expect(await copies()).toBe(before + 1)
  })

  test('the admin Routes view lists routes and copied items and switches range', async () => {
    await page.goto('/admin/system/stats?tab=routes')
    await expect(page.getByTestId('traffic-tab')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('traffic-route-/faq')).toContainText('views')
    await expect(page.getByTestId('traffic-copied')).toContainText(`Count ${s}`)
    await expect(page.getByTestId('traffic-note')).toContainText('14 days')
    await expect(page.getByTestId('traffic-range').getByRole('radio')).toHaveCount(3)
    const month = page.waitForResponse(r => r.url().includes('/api/v1/admin/stats/traffic?days=30'))
    await page.getByRole('radio', { name: '30 days' }).check()
    await month
    await expect(page.getByTestId('traffic-route-/faq')).toBeVisible()
    await page.getByRole('radio', { name: '90 days' }).check()
    await expect(page.getByTestId('traffic-totals')).toContainText('views')
  })
})
