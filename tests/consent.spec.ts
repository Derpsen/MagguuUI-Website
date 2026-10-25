import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { hydrated } from './support/hydrated'

/**
 * Part 1 of the consent feature (the visitor log is on by default, nothing is set in playwright.config.ts):
 * first visit shows the banner and sets NO cookie; "Necessary only" sets only the consent cookie and stores
 * nothing; "Accept all" adds the session cookie and detailed rows; the footer link revokes (cookie and rows gone);
 * Global Privacy Control means no banner and no rows; /admin has no banner.
 * Rows are read straight from the dev database and told apart by a unique user-agent suffix.
 * Every other spec starts with a stored "necessary only" choice (playwright.config.ts); this one starts clean.
 */

test.use({ storageState: { cookies: [], origins: [] } })
test.describe.configure({ mode: 'serial' })

const DB_PATH = join(process.cwd(), 'data', 'magguuui.db')
const BASE_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

interface Session { visitor_id: string | null, city: string | null, exit_path: string | null, screen_w: number | null, screen_h: number | null, language: string | null, timezone: string | null, utm_source: string | null, utm_medium: string | null, utm_campaign: string | null, utm_term: string | null, id: string, ip: string | null, user_agent: string | null, browser: string, os: string, country: string, referrer_url: string | null, referrer_host: string | null, landing_path: string, hits: number }

function sessionsFor(marker: string): Session[] {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
  try { return db.prepare('SELECT * FROM visitor_sessions WHERE user_agent LIKE ?').all(`%${marker}%`) as Session[] } finally { db.close() }
}
function hitsFor(marker: string): string[] {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
  try {
    return (db.prepare('SELECT h.path FROM visitor_hits h JOIN visitor_sessions s ON s.id = h.session_id WHERE s.user_agent LIKE ? ORDER BY h.id').all(`%${marker}%`) as Array<{ path: string }>).map(r => r.path)
  } finally { db.close() }
}

function detailFor(marker: string): Array<{ path: string, dwell_s: number | null, scroll_max: number }> {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
  try {
    return db.prepare('SELECT h.path, h.dwell_s, h.scroll_max FROM visitor_hits h JOIN visitor_sessions s ON s.id = h.session_id WHERE s.user_agent LIKE ? ORDER BY h.id').all(`%${marker}%`) as Array<{ path: string, dwell_s: number | null, scroll_max: number }>
  } finally { db.close() }
}
function eventsFor(marker: string): Array<{ kind: string, target: string, path: string }> {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
  try {
    return db.prepare('SELECT e.kind, e.target, e.path FROM visitor_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE s.user_agent LIKE ? ORDER BY e.id').all(`%${marker}%`) as Array<{ kind: string, target: string, path: string }>
  } finally { db.close() }
}

let n = 0
const newMarker = () => `consent-e2e-${Date.now().toString(36)}-${n++}`

async function visitor(browser: import('@playwright/test').Browser, marker: string, extra: Parameters<import('@playwright/test').Browser['newContext']>[0] = {}) {
  const context = await browser.newContext({ userAgent: `${BASE_UA} ${marker}`, storageState: { cookies: [], origins: [] }, ...extra })
  const page = await context.newPage()
  const setCookieSeen: string[] = []
  page.on('response', async (r) => {
    const h = await r.allHeaders().catch(() => ({} as Record<string, string>))
    if (h['set-cookie']) setCookieSeen.push(`${r.url()} ${h['set-cookie']}`)
  })
  return { context, page, setCookieSeen }
}
const names = async (context: BrowserContext) => (await context.cookies()).map(c => c.name).sort()
const banner = (page: Page) => page.getByTestId('consent-banner')

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
}

test('first visit: the banner shows and nothing at all is set before a click', async ({ browser }) => {
  const marker = newMarker()
  const { context, page, setCookieSeen } = await visitor(browser, marker)
  await page.goto('/')
  await expect(banner(page)).toBeVisible()
  await expect(banner(page)).toHaveAttribute('role', 'region')
  await expect(banner(page).getByRole('button')).toHaveText(['Accept all', 'Necessary only', 'Settings'])
  await settle(page)
  await page.goto('/guide')
  await settle(page)
  expect(await names(context)).toEqual([])
  expect(setCookieSeen).toEqual([])
  expect(sessionsFor(marker)).toEqual([])
  // a bar over the page, not a modal: fixed, no focus taken, nothing inert
  expect(await banner(page).evaluate(el => getComputedStyle(el).position)).toBe('fixed')
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  await expect(page.locator('main')).not.toHaveAttribute('inert', /.*/)
  await expect(banner(page).locator('[aria-modal]')).toHaveCount(0)
  await context.close()
})

// A real first visit: empty storage (no pre-seeded mg_consent), no GPC/DNT, on "/". The banner must be on screen, inside the viewport.
for (const [name, viewport] of [['desktop 1280x800', { width: 1280, height: 800 }], ['mobile 390', { width: 390, height: 844 }]] as const) {
  test(`first visit on / (${name}, fresh context): the banner is visible inside the viewport`, async ({ browser }) => {
    const { context, page } = await visitor(browser, newMarker(), { viewport })
    await page.goto('/')
    await expect(banner(page)).toBeVisible()
    expect(await page.evaluate(() => [navigator.doNotTrack, (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl])).toEqual([null, undefined])
    const box = await banner(page).boundingBox()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
    expect(await names(context)).toEqual([])
    await context.close()
  })
}

test('the three actions are equal: same size and style, and Escape is not a choice', async ({ browser }) => {
  const { context, page } = await visitor(browser, newMarker())
  await page.goto('/')
  await expect(banner(page)).toBeVisible()
  const styles = await banner(page).getByRole('button').evaluateAll(btns => btns.map((b) => {
    const cs = getComputedStyle(b)
    return [cs.fontSize, cs.fontWeight, cs.color, cs.backgroundColor, cs.borderTopWidth, cs.borderTopColor, cs.paddingTop, cs.paddingLeft, cs.height].join('|')
  }))
  expect(new Set(styles).size).toBe(1)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Escape')
  await expect(banner(page)).toBeVisible()
  expect(await names(context)).toEqual([])
  await context.close()
})

test('"Necessary only": only the consent cookie, no session cookie, nothing stored', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker)
  await page.goto('/')
  await hydrated(page) // the banner buttons act only after hydration
  await banner(page).getByTestId('consent-necessary').click()
  await expect(banner(page)).toBeHidden()
  const cookies = await context.cookies()
  expect(cookies.map(c => c.name)).toEqual(['mg_consent'])
  const c = cookies[0]!
  expect(JSON.parse(decodeURIComponent(c.value))).toMatchObject({ v: 1, stats: false })
  expect(Object.keys(JSON.parse(decodeURIComponent(c.value))).sort()).toEqual(['stats', 'ts', 'v'])
  expect(c.sameSite).toBe('Lax')
  expect(c.path).toBe('/')
  expect(c.httpOnly).toBe(false)
  expect(c.expires - Date.now() / 1000).toBeGreaterThan(170 * 86400)
  expect(c.expires - Date.now() / 1000).toBeLessThan(181 * 86400)
  await page.goto('/strings')
  await settle(page)
  expect(await names(context)).toEqual(['mg_consent'])
  expect(sessionsFor(marker)).toEqual([])
  await page.reload()
  await expect(banner(page)).toHaveCount(0) // the choice is remembered
  await context.close()
})

test('"Accept all": consent cookie + session cookie, the visit is recorded in detail', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker)
  await page.goto('/', { referer: 'https://example.org/some/post?id=7' })
  await hydrated(page) // the banner buttons act only after hydration
  await expect(banner(page)).toBeVisible()
  expect(sessionsFor(marker)).toEqual([])
  await banner(page).getByTestId('consent-accept').click()
  await expect(banner(page)).toBeHidden()
  await expect.poll(() => sessionsFor(marker).length).toBe(1)
  await expect.poll(() => names(context)).toEqual(['mg_consent', 'mg_sid', 'mg_vid']) // the row is written before the browser has processed Set-Cookie

  const cookies = await context.cookies()
  expect(cookies.map(c => c.name).sort()).toEqual(['mg_consent', 'mg_sid', 'mg_vid'])
  const sid = cookies.find(c => c.name === 'mg_sid')!
  expect(sid.value).toMatch(/^[0-9a-f]{32}$/)
  expect(sid.httpOnly).toBe(true)
  expect(sid.sameSite).toBe('Lax')
  expect(sid.expires - Date.now() / 1000).toBeLessThan(31 * 60)
  expect(JSON.parse(decodeURIComponent(cookies.find(c => c.name === 'mg_consent')!.value)).stats).toBe(true)
  const vid = cookies.find(c => c.name === 'mg_vid')!
  expect(vid.value).toMatch(/^[0-9a-f]{32}$/)
  expect(vid.httpOnly).toBe(true)
  expect(vid.sameSite).toBe('Lax')
  expect(vid.expires - Date.now() / 1000).toBeGreaterThan(394 * 86400) // 13 months
  expect(vid.expires - Date.now() / 1000).toBeLessThan(396 * 86400)

  const [s] = sessionsFor(marker)
  expect(s!.id).toBe(sid.value)
  expect(s!.ip).toBeTruthy()
  expect(s!.user_agent).toContain(marker)
  expect(s!.browser).toBe('Chrome')
  expect(s!.os).toBe('Linux')
  expect(s!.country).toBe('unknown') // direct connection: no Cloudflare header is believed
  expect(s!.referrer_url).toBe('https://example.org/some/post?id=7')
  expect(s!.referrer_host).toBe('example.org')
  expect(s!.landing_path).toBe('/')
  expect(hitsFor(marker)).toEqual(['/'])

  await page.getByRole('link', { name: 'Strings', exact: true }).first().click()
  await expect(page).toHaveURL(/\/strings$/)
  await expect.poll(() => hitsFor(marker)).toEqual(['/', '/strings'])
  expect(sessionsFor(marker)).toHaveLength(1)
  expect(sessionsFor(marker)[0]!.hits).toBe(2)
  expect(sessionsFor(marker)[0]!.referrer_url).toBe('https://example.org/some/post?id=7') // the landing referrer, once
  await context.close()
})

test('Settings: the statistics toggle is off by default; saving it off stores nothing, on records', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker)
  await page.goto('/')
  await hydrated(page) // the banner buttons act only after hydration
  await banner(page).getByTestId('consent-settings').click()
  const toggle = banner(page).getByTestId('consent-stats-toggle')
  await expect(toggle).not.toBeChecked()
  await expect(toggle).toHaveAccessibleName('Visitor statistics')
  await banner(page).getByTestId('consent-back').click()
  await expect(banner(page).getByTestId('consent-accept')).toBeVisible()
  await banner(page).getByTestId('consent-settings').click()
  await banner(page).getByTestId('consent-save').click()
  await expect(banner(page)).toBeHidden()
  expect(await names(context)).toEqual(['mg_consent'])
  expect(sessionsFor(marker)).toEqual([])

  await page.getByTestId('cookie-settings').click()
  await expect(banner(page)).toBeVisible()
  await expect(banner(page).getByTestId('consent-current')).toContainText('necessary only')
  await banner(page).getByTestId('consent-settings').click()
  await banner(page).getByTestId('consent-stats-toggle').check()
  await banner(page).getByTestId('consent-save').click()
  await expect.poll(() => sessionsFor(marker).length).toBe(1)
  await expect.poll(() => names(context)).toEqual(['mg_consent', 'mg_sid', 'mg_vid'])
  await context.close()
})

test('revoking through the footer link removes the session cookie and the records; nothing more is stored', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker)
  await page.goto('/')
  await hydrated(page) // the banner buttons act only after hydration
  await banner(page).getByTestId('consent-accept').click()
  await expect.poll(() => sessionsFor(marker).length).toBe(1)
  await expect.poll(() => names(context)).toEqual(['mg_consent', 'mg_sid', 'mg_vid']) // the row is written before the browser has processed Set-Cookie

  const footerLink = page.getByTestId('cookie-settings')
  await expect(footerLink).toHaveText('Cookie settings')
  await footerLink.click()
  await expect(banner(page)).toBeVisible()
  await expect(banner(page).getByTestId('consent-current')).toContainText('visitor statistics allowed')
  // the visitor opened it: focus moves to it, Escape closes it and focus goes back
  await expect(page.locator('#consent-title')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(banner(page)).toBeHidden()
  await expect(footerLink).toBeFocused()

  await footerLink.click()
  await banner(page).getByTestId('consent-necessary').click()
  await expect(banner(page)).toBeHidden()
  expect(await names(context)).toEqual(['mg_consent'])
  expect(JSON.parse(decodeURIComponent((await context.cookies())[0]!.value)).stats).toBe(false)
  expect(sessionsFor(marker)).toEqual([])
  expect(hitsFor(marker)).toEqual([])

  await page.goto('/guide')
  await settle(page)
  await page.goto('/faq')
  await settle(page)
  expect(await names(context)).toEqual(['mg_consent'])
  expect(sessionsFor(marker)).toEqual([])
  await context.close()
})

test('a returning visitor with consent is recorded without a banner', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker)
  await page.goto('/')
  await hydrated(page) // the banner buttons act only after hydration
  await banner(page).getByTestId('consent-accept').click()
  await expect.poll(() => sessionsFor(marker).length).toBe(1)
  await expect.poll(() => names(context)).toEqual(['mg_consent', 'mg_sid', 'mg_vid']) // the row is written before the browser has processed Set-Cookie: wait for the cookie, or a later clearCookies/click races it
  // session cookie expired (30 min), consent cookie still valid: a new session starts on the next visit
  await context.clearCookies({ name: 'mg_sid' })
  // The visit is recorded by the page's own beacon after hydration: wait for that response, not for a 5 s guess.
  const recorded = page.waitForResponse(r => r.url().endsWith('/api/v1/visitor-hit') && r.request().method() === 'POST')
  await page.goto('/about')
  await expect(banner(page)).toHaveCount(0)
  await recorded
  await expect.poll(() => sessionsFor(marker).length).toBe(2)
  const ids = sessionsFor(marker).map(x => x.visitor_id)
  expect(ids[0]).toMatch(/^[0-9a-f]{32}$/)
  expect(ids[1]).toBe(ids[0]) // the returning-visitor cookie links the two visits
  await context.close()
})

test('extended signals with consent: utm, screen, language, time zone, sequence, dwell, scroll and clicks (country/city need a trusted proxy: unit tests)', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker, {
    locale: 'de-DE', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 800 },
  })
  await page.goto('/?utm_source=newsletter&utm_medium=email&utm_campaign=autumn&utm_term=&secret=nope')
  await hydrated(page)
  await banner(page).getByTestId('consent-accept').click()
  await expect.poll(() => sessionsFor(marker).length).toBe(1)
  await expect.poll(() => names(context)).toEqual(['mg_consent', 'mg_sid', 'mg_vid']) // the row is written before the browser has processed Set-Cookie: wait for the cookie, or a later clearCookies/click races it
  const [s] = sessionsFor(marker)
  expect(s).toMatchObject({ utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'autumn', utm_term: null, language: 'de-DE', timezone: 'Europe/Berlin', country: 'unknown', city: null, landing_path: '/' })
  expect(s!.screen_w).toBeGreaterThan(0)
  expect(s!.screen_h).toBeGreaterThan(0)

  // a click on a marked call to action, then time on the page and scrolling
  await page.locator('[data-cta="hero-setup"]').first().click()
  await expect(page).toHaveURL(/\/guide$/)
  await expect.poll(() => eventsFor(marker)).toEqual([{ kind: 'cta', target: 'hero-setup', path: '/' }])
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(600)
  // an external link and a download are classified (the navigation itself is cancelled), other links are not recorded
  await page.evaluate(() => {
    const links: Array<[string, string]> = [['t-ext', 'https://github.com/Derpsen/MagguuUI?tab=readme#x'], ['t-dl', '/files/MagguuUI.zip?token=abc'], ['t-in', '/faq']]
    for (const [id, href] of links) {
      const a = document.createElement('a')
      a.id = id
      a.href = href
      a.textContent = 'free text that must never be stored'
      document.body.append(a)
      a.addEventListener('click', e => e.preventDefault())
    }
  })
  for (const id of ['t-ext', 't-dl', 't-in']) await page.locator(`#${id}`).click()
  await expect.poll(() => eventsFor(marker).length).toBe(3)
  expect(eventsFor(marker).slice(1)).toEqual([
    { kind: 'external', target: 'github.com', path: '/guide' },
    { kind: 'download', target: 'MagguuUI.zip', path: '/guide' },
  ])
  await page.getByRole('link', { name: 'Strings', exact: true }).first().click()
  await expect(page).toHaveURL(/\/strings$/)
  // Leaving /guide sends the dwell report and the /strings hit as two separate requests; each is checked by waiting
  // for its own stored state, never by assuming the second has landed because the first has.
  await expect.poll(() => detailFor(marker).find(h => h.path === '/guide')?.dwell_s ?? 0).toBeGreaterThanOrEqual(1)
  await expect.poll(() => detailFor(marker).find(h => h.path === '/guide')?.scroll_max ?? 0).toBeGreaterThanOrEqual(25)
  await expect.poll(() => detailFor(marker).map(h => h.path)).toEqual(['/', '/guide', '/strings'])
  await expect.poll(() => sessionsFor(marker)[0]?.exit_path).toBe('/strings')
  expect(JSON.stringify(eventsFor(marker))).not.toContain('free text')

  // revoking removes the cookies and everything recorded for this browser
  await page.getByTestId('cookie-settings').click()
  await banner(page).getByTestId('consent-necessary').click()
  await expect(banner(page)).toBeHidden()
  expect(await names(context)).toEqual(['mg_consent'])
  expect(sessionsFor(marker)).toEqual([])
  expect(eventsFor(marker)).toEqual([])
  await context.close()
})

test('Global Privacy Control: no banner, no cookie, nothing recorded; the footer link explains', async ({ browser }) => {
  const marker = newMarker()
  const { context, page, setCookieSeen } = await visitor(browser, marker, { extraHTTPHeaders: { 'Sec-GPC': '1' } })
  await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }))
  await page.goto('/')
  await settle(page)
  await expect(banner(page)).toHaveCount(0)
  await page.goto('/strings')
  await settle(page)
  expect(await names(context)).toEqual([])
  expect(setCookieSeen).toEqual([])
  expect(sessionsFor(marker)).toEqual([])
  await page.getByTestId('cookie-settings').click()
  await expect(banner(page)).toBeVisible()
  await expect(banner(page)).toContainText('Global Privacy Control')
  await expect(banner(page).getByTestId('consent-accept')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(banner(page)).toBeHidden()
  expect(await names(context)).toEqual([])
  await context.close()
})

test('Do Not Track is a refusal too', async ({ browser }) => {
  const marker = newMarker()
  const { context, page } = await visitor(browser, marker, { extraHTTPHeaders: { DNT: '1' } })
  await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { value: '1' }))
  await page.goto('/')
  await settle(page)
  await expect(banner(page)).toHaveCount(0)
  expect(await names(context)).toEqual([])
  expect(sessionsFor(marker)).toEqual([])
  await context.close()
})

test('the admin area has no banner and no consent logic', async ({ browser }) => {
  const { context, page } = await visitor(browser, newMarker())
  const consentCalls: string[] = []
  page.on('request', (r) => { if (/\/api\/v1\/(consent|visitor-hit)/.test(r.url())) consentCalls.push(r.url()) })
  await page.goto('/admin/login')
  await settle(page)
  await expect(banner(page)).toHaveCount(0)
  await expect(page.getByTestId('cookie-settings')).toHaveCount(0)
  await page.goto('/admin')
  await settle(page)
  await expect(banner(page)).toHaveCount(0)
  expect(consentCalls).toEqual([])
  expect((await names(context)).filter(n => n.startsWith('mg_'))).toEqual([])
  await context.close()
})

for (const mode of ['dark', 'light'] as const) {
  test(`the banner and the settings view pass axe (${mode})`, async ({ browser }) => {
    const { context, page } = await visitor(browser, newMarker())
    await page.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), mode)
    await page.goto('/')
    await hydrated(page)
    await expect(banner(page)).toBeVisible()
    for (const view of ['banner', 'settings']) {
      if (view === 'settings') await banner(page).getByTestId('consent-settings').click()
      const results = await new AxeBuilder({ page }).include('[data-testid="consent-banner"]').analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
    }
    await context.close()
  })
}
