import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** Public status page (/status) and its minimal endpoint (/api/v1/status). */

type Payload = {
  status: string
  checkedAt: string
  components: Array<{ id: string, name: string, state: string, note: string | null }>
  uptime: { ready: boolean, windows: Array<{ days: number, percent: number }>, note: string }
  notices: Array<Record<string, unknown>>
  history: Array<Record<string, unknown>>
}

const fake = (over: Partial<Payload> = {}): { success: true, data: Payload } => ({
  success: true,
  data: {
    status: 'degraded',
    checkedAt: '2026-10-25T03:12:00.000Z',
    components: [
      { id: 'website', name: 'Website', state: 'operational', note: null },
      { id: 'database', name: 'Database', state: 'degraded', note: 'Responding slowly' },
      { id: 'content', name: 'Data freshness', state: 'operational', note: 'Latest release note: 2026-10-20' },
    ],
    uptime: { ready: true, windows: [{ days: 1, percent: 99.3 }, { days: 7, percent: 99.95 }], note: 'Measured by the site itself.' },
    notices: [{
      id: 'n1', kind: 'maintenance', status: 'scheduled', title: 'Planned work', bodyHtml: '<p>Short break at <strong>08:00 UTC</strong>.</p>',
      component: 'database', startsAt: '2026-10-26T08:00:00.000Z', endsAt: '2026-10-26T09:00:00.000Z', resolvedAt: null, updates: [],
    }],
    history: [{
      id: 'h1', kind: 'incident', status: 'resolved', title: 'Slow responses', bodyHtml: '<p>Pages loaded slowly.</p>', component: 'website',
      startsAt: '2026-10-20T10:00:00.000Z', endsAt: null, resolvedAt: '2026-10-20T11:30:00.000Z',
      updates: [
        { at: '2026-10-20T10:20:00.000Z', status: 'monitoring', bodyHtml: '<p>A fix is out.</p>' },
        { at: '2026-10-20T11:30:00.000Z', status: 'resolved', bodyHtml: '<p>Back to normal.</p>' },
      ],
    }],
    ...over,
  },
})

test('the status endpoint exposes only the whitelisted coarse fields and is cached briefly', async ({ request }) => {
  const res = await request.get('/api/v1/status')
  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toContain('max-age=30')
  expect(res.headers()['set-cookie']).toBeUndefined()
  const first = (await res.json() as { data: Payload }).data
  expect(Object.keys(first).sort()).toEqual(['checkedAt', 'components', 'history', 'notices', 'status', 'uptime'])
  expect(first.components.map(c => c.id)).toEqual(['website', 'database', 'content'])
  for (const c of first.components) expect(Object.keys(c).sort()).toEqual(['id', 'name', 'note', 'state'])
  expect(['operational', 'degraded', 'down']).toContain(first.status)
  expect(JSON.stringify(first)).not.toMatch(/sha|build|version|uptimeSeconds|startedAt|unraid|docker|plex|discord|localhost|127\.0\.0\.1|:\d{4}\b/i)
  // Second call inside the cache window: same snapshot, no new database check.
  const again = (await (await request.get('/api/v1/status')).json() as { data: Payload }).data
  expect(again.checkedAt).toBe(first.checkedAt)
})

test('/api/health is unchanged and stays separate', async ({ request }) => {
  const body = await (await request.get('/api/health')).json() as Record<string, unknown>
  expect(Object.keys(body).sort()).toEqual(['build', 'checks', 'startedAt', 'status', 'timestamp', 'uptimeSeconds'])
})

test('the page renders its state on the server, without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.goto('/status')
  await expect(page.getByRole('heading', { level: 1, name: 'Website status' })).toBeVisible()
  await expect(page.getByTestId('status-overall')).toContainText(/All systems operational|degraded|down/)
  await expect(page.getByTestId('status-checked')).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)
  for (const id of ['website', 'database', 'content']) {
    await expect(page.getByTestId(`status-component-${id}`)).toContainText(/Operational|Degraded|Down/)
  }
  await expect(page.getByTestId('status-uptime')).toBeVisible()
  // Honest by construction: either collecting data or real measured windows, never an empty number.
  const collecting = await page.getByTestId('status-collecting').count()
  if (collecting) await expect(page.getByTestId('status-collecting')).toContainText('Collecting data')
  else await expect(page.getByTestId('status-uptime')).toContainText(/\d+\.\d{2}%/)
  await expect(page.getByTestId('status-history')).toContainText('History')
  await ctx.close()
})

test('noindex, not in the sitemap, linked in the footer', async ({ page, request }) => {
  await page.goto('/status')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  const head = await request.get('/status')
  expect(head.headers()['x-robots-tag']).toMatch(/noindex/)
  await expect(page).toHaveTitle(/Website status/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /database/i)
  const xml = await (await request.get('/sitemap.xml')).text()
  expect(xml).not.toContain('/status')
  await page.goto('/privacy')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Status', exact: true }).click()
  await expect(page).toHaveURL(/\/status$/)
})

for (const mode of ['dark', 'light'] as const) {
  test(`degraded state, notices and measured availability render and pass axe (${mode})`, async ({ page }) => {
    await page.route('**/api/v1/status', route => route.fulfill({ json: fake() }))
    await page.addInitScript(m => localStorage.setItem('nuxt-color-mode', m), mode)
    // Client-side navigation so the mocked endpoint is the one the page reads.
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Status', exact: true }).click()
    await expect(page.getByTestId('status-overall')).toContainText('Some systems are degraded')
    await expect(page.getByTestId('status-component-database')).toContainText('Degraded')
    await expect(page.getByTestId('status-component-database')).toContainText('Responding slowly')
    await expect(page.getByTestId('status-checked')).toContainText('2026-10-25 03:12 UTC')
    await expect(page.getByTestId('status-uptime-1')).toContainText('99.30%')
    await expect(page.getByTestId('status-uptime-7')).toContainText('99.95%')
    await expect(page.getByTestId('status-notices')).toContainText('Planned work')
    await expect(page.getByTestId('status-notices')).toContainText('Short break at 08:00 UTC.')
    await expect(page.getByTestId('status-notices')).toContainText('Maintenance · Scheduled · Database')
    await expect(page.getByTestId('status-notices')).toContainText('Planned 2026-10-26 08:00 UTC to 2026-10-26 09:00 UTC')
    // History: resolved notices with their timeline (collapsed by default, readable text either way).
    const hist = page.getByTestId('status-history-h1')
    await expect(hist).toContainText('Slow responses')
    await expect(hist).toContainText('resolved 2026-10-20 11:30 UTC')
    await hist.locator('summary').click()
    await expect(page.getByTestId('status-history-h1-timeline')).toContainText('A fix is out.')
    await expect(page.getByTestId('status-history-h1-timeline')).toContainText('Back to normal.')
    await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : /light/)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
}

test('a down state is spelled out in words, not only by colour', async ({ page }) => {
  await page.route('**/api/v1/status', route => route.fulfill({
    json: fake({
      status: 'down',
      components: [
        { id: 'website', name: 'Website', state: 'operational', note: null },
        { id: 'database', name: 'Database', state: 'down', note: 'Not responding' },
        { id: 'content', name: 'Data freshness', state: 'down', note: 'Content cannot be read' },
      ],
      uptime: { ready: false, windows: [], note: 'Measured by the site itself.' },
      notices: [],
      history: [],
    }),
  }))
  await page.goto('/privacy')
  await page.waitForLoadState('networkidle')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Status', exact: true }).click()
  await expect(page.getByTestId('status-overall')).toContainText('The website is down')
  await expect(page.getByTestId('status-component-database')).toContainText('Down')
  await expect(page.getByTestId('status-collecting')).toContainText('Collecting data')
  await expect(page.getByTestId('status-history-empty')).toContainText('No resolved notices')
})
