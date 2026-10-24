import { expect, test } from '@playwright/test'

/**
 * Changelog filter, "since my version" and feeds. Rows v0.9.1 to v0.9.3 come
 * from server/plugins/e2e-seed.ts (NUXT_E2E_SEED); v0.9.1 and v0.9.3 mention
 * "Zebrafish".
 */
const release = (page: import('@playwright/test').Page, v: string) => page.locator(`article[id="release-${v}"]`)

test('since filter shows only newer releases, is shareable and keeps the input', async ({ page }) => {
  await page.goto('/changelog?since=0.9.1&to=0.9.9')
  await expect(release(page, 'v0-9-3')).toBeVisible()
  await expect(release(page, 'v0-9-2')).toBeVisible()
  await expect(release(page, 'v0-9-1')).toHaveCount(0)
  await expect(page.getByTestId('changelog-status')).toContainText('newer than 0.9.1')
  await expect(page.getByLabel('My installed version')).toHaveValue('0.9.1')
})

test('submitting the form updates the URL and tolerates dev-build formats', async ({ page }) => {
  await page.goto('/changelog')
  await page.getByLabel('My installed version').fill('v0.9.2-Dev-16')
  await page.getByLabel('To version').fill('0.9.9')
  await page.getByRole('button', { name: 'Show', exact: true }).click()
  await expect(page).toHaveURL(/since=v0\.9\.2-Dev-16/)
  // 0.9.2-Dev-16 is older than 0.9.2, so 0.9.2 and 0.9.3 are news.
  await expect(release(page, 'v0-9-2')).toBeVisible()
  await expect(release(page, 'v0-9-3')).toBeVisible()
  await expect(release(page, 'v0-9-1')).toHaveCount(0)
})

test('up-to-date and invalid inputs give clear messages', async ({ page }) => {
  await page.goto('/changelog?since=9999.0.0')
  await expect(page.getByTestId('changelog-status')).toContainText('up to date')
  await page.goto('/changelog?since=banana&to=0.9.9')
  await expect(page.getByRole('alert')).toContainText('not a version number')
  await expect(release(page, 'v0-9-3')).toBeVisible()
})

test('version range and mention filter combine', async ({ page }) => {
  await page.goto('/changelog?from=0.9.2&to=0.9.3')
  await expect(release(page, 'v0-9-3')).toBeVisible()
  await expect(release(page, 'v0-9-2')).toBeVisible()
  await expect(release(page, 'v0-9-1')).toHaveCount(0)
  await page.goto('/changelog?from=0.9.1&to=0.9.3&q=zebrafish')
  await expect(release(page, 'v0-9-3')).toBeVisible()
  await expect(release(page, 'v0-9-1')).toBeVisible()
  await expect(release(page, 'v0-9-2')).toHaveCount(0)
  await page.getByRole('link', { name: 'Reset' }).click()
  await expect(page).toHaveURL(/\/changelog$/)
})

test('filter works without JavaScript (server-rendered GET form)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  try {
    await page.goto('/changelog?since=0.9.2&to=0.9.9')
    await expect(release(page, 'v0-9-3')).toBeVisible()
    await expect(release(page, 'v0-9-2')).toHaveCount(0)
    await page.getByLabel('My installed version').fill('0.9.1')
    await page.getByLabel('To version').fill('0.9.9')
    await page.getByRole('button', { name: 'Show', exact: true }).click()
    await expect(page).toHaveURL(/since=0\.9\.1/)
    await expect(release(page, 'v0-9-2')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('head links and visible links point at the feeds', async ({ page }) => {
  await page.goto('/changelog')
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', /\/changelog\/feed\.xml$/)
  await expect(page.locator('link[rel="alternate"][type="application/atom+xml"]')).toHaveAttribute('href', /\/changelog\/atom\.xml$/)
  await expect(page.getByRole('link', { name: 'RSS', exact: true })).toHaveAttribute('href', '/changelog/feed.xml')
  await expect(page.getByRole('link', { name: 'Atom', exact: true })).toHaveAttribute('href', '/changelog/atom.xml')
})

for (const [path, type, root] of [
  ['/changelog/feed.xml', 'application/rss+xml', '<rss '],
  ['/changelog/atom.xml', 'application/atom+xml', '<feed '],
] as const) {
  test(`${path} serves valid cached XML without Unreleased`, async ({ request }) => {
    const res = await request.get(path)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain(type)
    expect(res.headers()['cache-control']).toMatch(/public.*max-age=600/)
    const etag = res.headers().etag
    expect(etag).toBeTruthy()
    const body = await res.text()
    expect(body).toContain(root)
    expect(body).toContain('v0.9.3')
    // The seed holds an Unreleased row and an unpublished v0.9.4: neither may appear.
    expect(body).not.toContain('Unreleased')
    expect(body).not.toContain('UNRELEASEDMARK')
    expect(body).not.toContain('DRAFTMARK')
    expect(body).not.toContain('v0.9.4')
    const again = await request.get(path, { headers: { 'If-None-Match': etag! } })
    expect(again.status()).toBe(304)
  })
}
