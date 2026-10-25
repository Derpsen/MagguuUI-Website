import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'
import Database from 'better-sqlite3'
import { join } from 'node:path'

/**
 * Admin Visitors view (part 2 of the consent feature): sessions table, filters, path of a session, CSV export,
 * dashboard sections, command palette entry, access control. Sessions are written straight into the dev database
 * (the capture itself is covered by consent.spec.ts) and told apart by a unique marker in the user agent / IP.
 */

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'
const DB_PATH = join(process.cwd(), 'data', 'magguuui.db')

test.describe.configure({ mode: 'serial' })

const marker = `e2evisitors${Date.now().toString(36)}`
const now = Math.floor(Date.now() / 1000)
const sid = (n: number) => `${marker.replace(/[^0-9a-f]/g, '').padEnd(8, '0').slice(0, 8)}${String(n).padStart(24, '0')}`
const IDS = [1, 2, 3].map(sid)
const VID = 'a'.repeat(32)

let context: BrowserContext
let page: Page
let api: APIRequestContext

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(DB_PATH, { fileMustExist: true })
  try { db.pragma('busy_timeout = 5000'); return fn(db) } finally { db.close() }
}

function seed() {
  withDb((db) => {
    const ins = db.prepare(`INSERT INTO visitor_sessions (id, visitor_id, started_at, last_seen, ip, user_agent, browser, os, device, country, city,
      referrer_url, referrer_host, landing_path, exit_path, hits, screen_w, screen_h, language, timezone, utm_source) VALUES (?, ?, ?, ?, ?, ?, 'Firefox', 'Linux', 'desktop', ?, ?, ?, ?, ?, ?, 2, 1920, 1080, 'en-US', 'Europe/Berlin', ?)`)
    // Returning visitor (same mg_vid): an older and a newer session. The first one's user agent tries a formula.
    ins.run(IDS[0], VID, now - 7200, now - 7100, '198.51.100.11', `=cmd|' /C calc'!A0 ${marker}`, 'DE', 'Berlin', 'https://news.example.test/a', 'news.example.test', '/', '/guide', 'e2e-news')
    ins.run(IDS[1], VID, now - 3600, now - 3500, '198.51.100.11', `Mozilla/5.0 ${marker}`, 'DE', null, null, null, '/strings', '/strings', null)
    ins.run(IDS[2], 'b'.repeat(32), now - 1800, now - 1700, '198.51.100.12', `Mozilla/5.0 ${marker}`, 'US', null, null, null, '/', '/', null)
    const hit = db.prepare('INSERT INTO visitor_hits (session_id, path, created_at, dwell_s, scroll_max) VALUES (?, ?, ?, ?, ?)')
    hit.run(IDS[0], '/', now - 7200, 31, 50)
    hit.run(IDS[0], '/guide', now - 7160, 12, 100)
    hit.run(IDS[1], '/strings', now - 3600, 8, 25)
    hit.run(IDS[2], '/', now - 1800, 5, 0)
    db.prepare("INSERT INTO visitor_events (session_id, path, kind, target, created_at) VALUES (?, '/', 'cta', 'hero-setup', ?)").run(IDS[0], now - 7190)
  })
}

function cleanup() {
  withDb((db) => {
    for (const t of ['visitor_hits', 'visitor_events']) db.prepare(`DELETE FROM ${t} WHERE session_id IN (${IDS.map(() => '?').join(',')})`).run(...IDS)
    db.prepare(`DELETE FROM visitor_sessions WHERE id IN (${IDS.map(() => '?').join(',')})`).run(...IDS)
    // Leftovers of an aborted earlier run (documentation IP range, never a real visitor).
    db.prepare("DELETE FROM visitor_hits WHERE session_id IN (SELECT id FROM visitor_sessions WHERE ip LIKE '198.51.100.%')").run()
    db.prepare("DELETE FROM visitor_events WHERE session_id IN (SELECT id FROM visitor_sessions WHERE ip LIKE '198.51.100.%')").run()
    db.prepare("DELETE FROM visitor_sessions WHERE ip LIKE '198.51.100.%'").run()
  })
}

test.beforeAll(async ({ browser }) => {
  cleanup()
  seed()
  context = await browser.newContext()
  page = await context.newPage()
  api = context.request
  const res = await api.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  cleanup()
  await context?.close()
})

const row = (n: number) => page.getByTestId(`visitor-row-${IDS[n]}`)

const DE = '/admin/system/visitors?days=1&country=DE'

test('the Visitors page lists sessions with flag, country, IP, browser, referrer, UTM, entry and exit', async () => {
  // Other specs create (country "unknown") sessions too and the list is paged, so every test narrows by country first.
  await page.goto(DE)
  await expect(page.getByTestId('visitors-table')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('visitors-flag')).toHaveText('on')
  const first = row(0)
  await expect(first).toContainText('Germany')
  await expect(first).toContainText('🇩🇪')
  await expect(first).toContainText('Berlin')
  await expect(first).toContainText('198.51.100.11')
  await expect(first).toContainText('Firefox, Linux, desktop')
  await expect(first).toContainText('news.example.test')
  await expect(first).toContainText('e2e-news')
  await expect(first).toContainText('/ → /guide')
  // The older of two sessions with the same visitor id is the first visit, the newer one the return.
  await expect(first).not.toContainText('returning')
  await expect(row(1)).toContainText('returning')
  await expect(row(2)).toHaveCount(0)
  await page.goto('/admin/system/visitors?days=1&country=US')
  await expect(row(2)).toContainText('United States')
  await expect(row(2)).toContainText('direct')
})

test('filters narrow the list (country, page, referrer, UTM, new vs returning, period)', async () => {
  await page.goto('/admin/system/visitors?days=1')
  await expect(page.getByTestId('visitors-table')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('vf-country').selectOption('US')
  await page.getByTestId('vf-apply').click()
  await expect(row(2)).toBeVisible()
  await expect(row(0)).toHaveCount(0)

  await page.goto(DE)
  await expect(row(0)).toBeVisible({ timeout: 30_000 })
  await expect(row(1)).toBeVisible()
  await page.getByTestId('vf-referrer').fill('news.example')
  await page.getByTestId('vf-apply').click()
  await expect(row(0)).toBeVisible()
  await expect(row(1)).toHaveCount(0)
  await page.getByTestId('vf-referrer').fill('')
  await expect(page.getByTestId('vf-referrer')).toHaveValue('')
  await page.getByTestId('vf-utm').fill('E2E-NEWS')
  await page.getByTestId('vf-apply').click()
  await expect(row(0)).toBeVisible()
  await expect(row(1)).toHaveCount(0)
  await page.getByTestId('vf-utm').fill('')
  await expect(page.getByTestId('vf-utm')).toHaveValue('')
  await page.getByTestId('vf-visitor').selectOption('returning')
  await page.getByTestId('vf-apply').click()
  await expect(row(1)).toBeVisible()
  await expect(row(0)).toHaveCount(0)
  await page.getByTestId('vf-visitor').selectOption('new')
  await page.getByTestId('vf-apply').click()
  await expect(row(0)).toBeVisible()
  await expect(row(1)).toHaveCount(0)
  await page.getByTestId('vf-visitor').selectOption('')
  await page.getByTestId('vf-page').selectOption('/strings')
  await page.getByTestId('vf-apply').click()
  await expect(row(1)).toBeVisible()
  await expect(row(0)).toHaveCount(0)
  await page.getByTestId('vf-referrer').fill(`${marker}-nothing`)
  await page.getByTestId('vf-apply').click()
  await expect(page.getByTestId('visitors-empty')).toContainText('No sessions match these filters')
  await page.getByTestId('vf-reset').click()
  await expect(page.getByTestId('vf-country')).toHaveValue('')
})

test('a session expands to its page sequence (dwell, scroll depth) and clicks', async () => {
  await page.goto(DE)
  await expect(row(0)).toBeVisible({ timeout: 30_000 })
  const toggle = page.getByTestId(`visitor-toggle-${IDS[0]}`)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const hits = page.getByTestId(`visitor-hits-${IDS[0]}`)
  await expect(hits).toBeVisible()
  await expect(hits.getByRole('row', { name: /\/guide/ })).toContainText('12s')
  await expect(hits.getByRole('row', { name: /\/guide/ })).toContainText('100%')
  await expect(hits.getByRole('row').nth(1)).toContainText('31s')
  await expect(page.getByTestId(`visitor-events-${IDS[0]}`)).toContainText('hero-setup')
  await toggle.click()
  await expect(page.getByTestId(`visitor-path-${IDS[0]}`)).toHaveCount(0)
})

test('CSV export: filtered, formula-safe, no-store, audited without payload', async () => {
  const before = await (await api.get('/api/v1/admin/audit?type=visitor_export')).json() as { data: { total: number } }
  const res = await api.get(`/api/v1/admin/visitors/export?days=1&country=DE`)
  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toBe('no-store')
  expect(res.headers()['content-type']).toContain('text/csv')
  expect(res.headers()['content-disposition']).toMatch(/attachment; filename="visitors-\d{4}-\d{2}-\d{2}\.csv"/)
  const text = await res.text()
  expect(text).toContain('started_at_utc,country,city,ip')
  expect(text).toContain("'=cmd|")
  expect(text).not.toMatch(/(^|,)=cmd/m)
  expect(text).not.toContain('198.51.100.12') // the US session is filtered out
  expect(text).toContain('198.51.100.11')
  const after = await (await api.get('/api/v1/admin/audit?type=visitor_export')).json() as { data: { items: Array<{ action: string, entityName: string, after: Record<string, unknown> }> } }
  const meta = await (await api.get('/api/v1/admin/audit?type=visitor_export')).json() as { meta?: { total: number } }
  expect((meta.meta?.total ?? 0)).toBeGreaterThan(before.data.total ?? 0)
  const latest = after.data.items[0]!
  expect(latest.action).toBe('exported')
  expect(JSON.stringify(latest)).not.toContain('198.51.100')
  expect(Object.keys(latest.after).sort()).toEqual(['filters', 'rows'])
})

test('the export link on the page points at the filtered CSV', async () => {
  await page.goto(DE)
  await expect(row(0)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('visitors-export')).toHaveAttribute('href', /\/api\/v1\/admin\/visitors\/export\?days=1&country=DE/)
})

test('without a login every visitors endpoint is refused and leaks nothing', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  for (const path of ['/api/v1/admin/visitors', `/api/v1/admin/visitors/${IDS[0]}`, '/api/v1/admin/visitors/export']) {
    const res = await anon.get(path)
    expect([401, 403], path).toContain(res.status())
    expect(await res.text()).not.toContain('198.51.100')
  }
  await anon.dispose()
})

test('viewer and editor accounts are refused on every visitors endpoint (full IPs are admin-only), the admin is not', async ({ playwright, baseURL }) => {
  const paths = ['/api/v1/admin/visitors', `/api/v1/admin/visitors/${IDS[0]}`, '/api/v1/admin/visitors/export']
  const created: number[] = []
  try {
    for (const role of ['viewer', 'editor'] as const) {
      const username = `e2e-${role}-${marker}`.slice(0, 40)
      const password = `Pw-${marker}-Aa1!`
      const make = await api.post('/api/v1/admin/users', { data: { username, password, role: 'viewer' } }) // the API only creates admin/viewer
      expect(make.status(), `create ${role}`).toBe(201)
      const id = (await make.json()).data.id as number
      created.push(id)
      if (role === 'editor') withDb(db => db.prepare('UPDATE users SET role = ? WHERE id = ?').run('editor', id)) // role is read from the database on every request
      const ctx = await playwright.request.newContext({ baseURL })
      try {
        const login = await ctx.post('/api/v1/auth/login', { data: { username, password } })
        expect(login.ok(), `${role} login → ${login.status()}`).toBe(true)
        for (const path of paths) {
          const res = await ctx.get(path)
          expect(res.status(), `${role} ${path}`).toBe(403)
          expect(await res.text()).not.toContain('198.51.100')
        }
        // the same account can still use the admin area it is meant for
        expect((await ctx.get('/api/v1/admin/faqs')).status(), `${role} still reads normal admin data`).toBeLessThan(400)
      } finally { await ctx.dispose() }
    }
    for (const path of paths) expect((await api.get(path)).status(), `admin ${path}`).toBe(200)
  } finally {
    for (const id of created) await api.delete(`/api/v1/admin/users/${id}`)
  }
})

test('dashboard shows Top countries and Top referrers as labelled plain sections', async () => {
  await page.goto('/admin')
  await expect(page.getByTestId('dash-countries')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('admin-dash-refresh').click()
  await expect(page.getByTestId('dash-country-DE')).toContainText('Germany')
  await expect(page.getByTestId('dash-country-DE')).toContainText('🇩🇪')
  const referrers = page.getByTestId('dash-referrers')
  await expect(referrers).toContainText('Consented visits (visitor log)')
  await expect(referrers).toContainText('Anonymous counter (all visitors, no cookies)')
  await expect(page.getByTestId('dash-referrers-consented')).toContainText('news.example.test')
})

test('the command palette finds the Visitor log', async () => {
  await page.goto('/admin/system/fields')
  await expect(page.getByRole('button', { name: 'Open command palette' }).first()).toBeAttached({ timeout: 30_000 })
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search admin pages and actions' }).fill('visitor log')
  await expect(page.getByRole('option').first()).toContainText('Visitor log')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/admin\/system\/visitors/)
})

for (const theme of ['dark', 'light'] as const) {
  test(`the Visitors page has no axe violations in the ${theme} theme`, async () => {
    await page.addInitScript((t) => { localStorage.setItem('nuxt-color-mode', t) }, theme)
    await page.goto(DE)
    await expect(row(0)).toBeVisible({ timeout: 30_000 })
    await page.getByTestId(`visitor-toggle-${IDS[0]}`).click()
    await expect(page.getByTestId(`visitor-hits-${IDS[0]}`)).toBeVisible()
    const results = await new AxeBuilder({ page }).include('[data-testid="visitors-page"]').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
  })
}
