import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

/**
 * LIVE walkthrough, GET only. All writes are aborted (page-view and copy-event beacons, forms) so the anonymous counters and
 * the database stay untouched. The only calls let through are the consent endpoints in the two tests marked ISOLATED:
 *  - "Necessary only" sets just the mg_consent cookie (no row).
 *  - "Accept all" (LIVE_ACCEPT=1) creates exactly one visitor row, which is deleted again by withdrawing consent in the same test.
 */
const PAGES = ['/', '/guide', '/strings', '/profiles', '/configurator', '/status', '/about', '/imprint', '/privacy', '/changelog', '/submit-preset', '/faq', '/addons', '/definitely-not-a-page']
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } } as const
const THEMES = ['dark', 'light'] as const

function guardWrites(ctx: BrowserContext, allow: RegExp[] = []) {
  const blocked: string[] = []
  return ctx.route('**/*', (route) => {
    const req = route.request()
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.continue()
    if (allow.some(r => r.test(req.url()))) return route.continue()
    blocked.push(`${req.method()} ${req.url()}`)
    return route.abort('blockedbyclient')
  }).then(() => blocked)
}

function watch(page: Page) {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || /Hydration|\[Vue warn\]/i.test(m.text())) issues.push(`console ${m.type()}: ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', e => issues.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('requestfailed', (r) => {
    if (r.failure()?.errorText === 'net::ERR_BLOCKED_BY_CLIENT') return // our own write guard
    issues.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`)
  })
  // F8: a public page must never contact a host other than the site itself (fonts and icons are self-hosted).
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (/^https?:$/.test(u.protocol) && u.host !== new URL(process.env.LIVE_URL || 'https://ui.magguu.xyz').host) issues.push(`third-party request: ${u.host}${u.pathname}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && r.request().resourceType() !== 'document') issues.push(`http ${r.status()}: ${r.url()}`)
  })
  return issues
}

async function themed(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript((t) => { localStorage.setItem('nuxt-color-mode', t) }, theme)
}

for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of THEMES) {
    test.describe(`${vpName} ${theme}`, () => {
      test.use({ viewport })
      for (const path of PAGES) {
        test(`${path}: loads, banner, axe, no console errors or failed requests`, async ({ browser }) => {
          const ctx = await browser.newContext({ viewport })
          const blocked = await guardWrites(ctx)
          const page = await ctx.newPage()
          await themed(page, theme)
          const issues = watch(page)
          const res = await page.goto(path)
          await page.waitForLoadState('networkidle')
          expect(res?.status(), path).toBe(path === '/definitely-not-a-page' ? 404 : 200)
          await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^((?!dark).)*$/)
          await expect(page.locator('h1').first()).toBeVisible()
          // A first visit sees the consent banner while the visitor log is on, and nothing is stored before a click.
          await expect(page.getByTestId('consent-accept')).toBeVisible()
          expect(await ctx.cookies(), 'no cookie before a click').toEqual([])
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), 'axe').toEqual([])
          expect(await ctx.cookies(), 'no cookie after load').toEqual([])
          expect(issues.filter(i => path !== '/definitely-not-a-page' || !/http 404/.test(i)), 'console / network').toEqual([])
          expect(blocked.filter(b => !/page-view|\/vitals/.test(b)), 'unexpected writes').toEqual([])
          await ctx.close()
        })
      }
    })
  }
}

test.describe('interactions (desktop)', () => {
  test.use({ viewport: VIEWPORTS.desktop })
  let ctx: BrowserContext
  let page: Page
  let issues: string[]
  let blocked: string[]
  test.beforeEach(async ({ browser }) => {
    ctx = await browser.newContext({ viewport: VIEWPORTS.desktop })
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
    blocked = await guardWrites(ctx)
    page = await ctx.newPage()
    issues = watch(page)
  })
  test.afterEach(async () => {
    expect(issues, 'console / network').toEqual([])
    expect(blocked, 'unexpected writes').toEqual([])
    await ctx.close()
  })

  test('nav and footer links lead to working pages', async () => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const nav = page.locator('header a[href^="/"]')
    const hrefs = [...new Set(await nav.evaluateAll(els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!)))].filter(h => h !== '/' && !h.startsWith('/admin'))
    expect(hrefs.length).toBeGreaterThan(4)
    for (const href of hrefs) {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.locator(`header a[href="${href}"]`).first().click()
      await expect(page).toHaveURL(new RegExp(`${href.replace(/\//g, '\\/')}(\\?.*)?$`))
      await expect(page.locator('h1').first()).toBeVisible()
    }
    const footer = [...new Set(await page.locator('footer a[href]').evaluateAll(els => els.map(e => (e as HTMLAnchorElement).href)))]
    expect(footer.length).toBeGreaterThan(8)
    for (const href of footer) {
      if (href.startsWith('mailto:')) continue
      const r = await ctx.request.get(href)
      expect(r.status(), href).toBeLessThan(400)
    }
    await expect(page.getByTestId('cookie-settings')).toBeVisible()
  })

  test('header search (Ctrl+K) opens, finds and closes', async () => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    const box = page.getByRole('combobox', { name: /Search guide, changelog, FAQ and strings/ })
    await expect(box).toBeVisible()
    await box.fill('guide')
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Escape')
    await expect(box).toBeHidden()
  })

  test('configurator selection flow and copy button', async () => {
    await page.goto('/configurator')
    await page.waitForLoadState('networkidle')
    const first = page.getByRole('checkbox').first()
    await expect(first).not.toBeChecked()
    await first.check()
    await expect.poll(() => new URL(page.url()).searchParams.get('addons')).toBeTruthy()
    const copy = page.getByRole('button', { name: /^Copy string:/ }).first()
    await expect(copy).toBeVisible()
    await copy.click()
    await expect(copy).toHaveText('Copied')
    expect((await page.evaluate(() => navigator.clipboard.readText())).length).toBeGreaterThan(10)
    await first.uncheck()
    await expect.poll(() => new URL(page.url()).searchParams.has('addons')).toBe(false)
    blocked = blocked.filter(b => !/copy-event|page-view/.test(b)) // the copy counter is aborted on purpose
  })

  test('profiles page shows previews with loaded images', async () => {
    await page.goto('/profiles')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
    const broken = await page.evaluate(() => [...document.images].filter(i => i.loading !== 'lazy' && i.complete && i.naturalWidth === 0).map(i => i.src))
    expect(broken).toEqual([])
  })

  test('strings copy button copies and announces', async () => {
    await page.goto('/strings')
    await page.waitForLoadState('networkidle')
    const button = page.getByRole('button', { name: 'Copy string', exact: true }).first()
    await expect(button).toBeVisible()
    await button.click()
    await expect(page.getByRole('button', { name: 'Copied', exact: true }).first()).toBeVisible()
    expect((await page.evaluate(() => navigator.clipboard.readText())).length).toBeGreaterThan(10)
    blocked = blocked.filter(b => !/copy-event|page-view/.test(b))
  })

  test('status page renders', async () => {
    await page.goto('/status')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('main')).not.toBeEmpty()
  })

  test('preset form renders (nothing is submitted)', async () => {
    await page.goto('/submit-preset')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('form').getByRole('button').last()).toBeVisible()
    expect(await page.locator('form input, form textarea, form select').count()).toBeGreaterThan(2)
  })

  test("what's-new banner shows for an older last-seen version and dismisses locally", async () => {
    await page.addInitScript(() => localStorage.setItem('lastSeenVersion', 'v0.0.1'))
    await page.goto('/guide')
    await page.waitForLoadState('networkidle')
    const banner = page.getByTestId('whats-new')
    await expect(banner).toBeVisible()
    await page.getByTestId('whats-new-dismiss').click()
    await expect(banner).toHaveCount(0)
  })

  test('privacy page has s10 to s12 with consent, retention and Cloudflare', async () => {
    await page.goto('/privacy')
    await expect(page.getByTestId('privacy-s10')).toContainText('Article 6(1)(a) GDPR')
    await expect(page.getByTestId('privacy-s10')).toContainText('Cookie settings')
    await expect(page.getByTestId('privacy-s11')).toContainText('mg_sid')
    await expect(page.getByTestId('privacy-s11')).toContainText('mg_vid')
    await expect(page.getByTestId('privacy-s12')).toContainText('13 months')
    await expect(page.getByTestId('privacy-s12')).toContainText('Cloudflare Tunnel')
  })
})

test.describe('consent behaviour', () => {
  test('GPC and DNT: no choice banner, nothing stored', async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { 'Sec-GPC': '1', DNT: '1' } })
    const blocked = await guardWrites(ctx)
    const page = await ctx.newPage()
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'globalPrivacyControl', { value: true })
      Object.defineProperty(navigator, 'doNotTrack', { value: '1' })
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('consent-accept')).toHaveCount(0)
    expect(await ctx.cookies()).toEqual([])
    expect(blocked).toEqual([])
    await ctx.close()
  })

  test('ISOLATED: "Necessary only" sets only mg_consent, survives a reload and can be reopened from the footer', async ({ browser }) => {
    const ctx = await browser.newContext()
    const blocked = await guardWrites(ctx, [/\/api\/v1\/consent$/])
    const page = await ctx.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(await ctx.cookies()).toEqual([])
    await page.getByTestId('consent-necessary').click()
    await expect(page.getByTestId('consent-accept')).toHaveCount(0)
    const cookies = await ctx.cookies()
    expect(cookies.map(c => c.name)).toEqual(['mg_consent'])
    console.log('LIVE mg_consent cookie:', JSON.stringify({ ...cookies[0], value: decodeURIComponent(cookies[0]!.value) }))
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('consent-accept')).toHaveCount(0)
    expect((await ctx.cookies()).map(c => c.name)).toEqual(['mg_consent'])
    await page.getByTestId('cookie-settings').click()
    await expect(page.getByTestId('consent-current')).toContainText('necessary only')
    expect(blocked.filter(b => !/page-view|\/vitals/.test(b))).toEqual([])
    await ctx.close()
  })

  test('ISOLATED (LIVE_ACCEPT=1): "Accept all" sets mg_sid and mg_vid, and withdrawing removes them again', async ({ browser }) => {
    test.skip(process.env.LIVE_ACCEPT !== '1', 'creates one live visitor row; run deliberately with LIVE_ACCEPT=1')
    const ctx = await browser.newContext()
    const blocked = await guardWrites(ctx, [/\/api\/v1\/consent$/, /\/api\/v1\/visitor-(hit|event)$/])
    const page = await ctx.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(await ctx.cookies()).toEqual([])
    await page.getByTestId('consent-accept').click()
    await expect.poll(async () => (await ctx.cookies()).map(c => c.name).sort()).toEqual(['mg_consent', 'mg_sid', 'mg_vid'])
    const jar = await ctx.cookies()
    for (const c of jar) console.log(`LIVE cookie ${c.name}: httpOnly=${c.httpOnly} secure=${c.secure} sameSite=${c.sameSite} expiresInDays=${((c.expires - Date.now() / 1000) / 86400).toFixed(1)} valueShape=${c.name === 'mg_consent' ? decodeURIComponent(c.value) : `${c.value.length} chars`}`)
    expect(jar.find(c => c.name === 'mg_sid')?.httpOnly).toBe(true)
    expect(jar.find(c => c.name === 'mg_vid')?.httpOnly).toBe(true)
    await page.getByTestId('cookie-settings').click()
    await page.getByTestId('consent-necessary').click()
    await expect.poll(async () => (await ctx.cookies()).map(c => c.name)).toEqual(['mg_consent'])
    expect(blocked.filter(b => !/page-view|\/vitals/.test(b))).toEqual([])
    await ctx.close()
  })
})
