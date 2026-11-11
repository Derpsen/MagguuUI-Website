import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Strings page: plain Copy button (Clipboard API, fallback, aria-live) and the
 * version/date stamp. The WowUp pack and the v0.9.x releases come from
 * server/plugins/e2e-seed.ts (NUXT_E2E_SEED).
 */
const PACK = 'E2E Test Pack'
const STAMP = /^(Version \d+\.\d+\.\d+(-[\w.-]+)?, updated|Updated) \d{4}-\d{2}-\d{2}$/

async function packString(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const list = await (await request.get('/api/v1/wowup?view=meta')).json()
  const id = list.data[PACK].id as number
  const one = await (await request.get(`/api/v1/wowup/${id}`)).json()
  return one.data.string as string
}

test('release-stamps lists published releases only', async ({ request }) => {
  const res = await request.get('/api/v1/release-stamps')
  expect(res.ok()).toBe(true)
  const body = await res.json()
  const versions = (body.data as { version: string }[]).map(r => r.version)
  expect(versions).toContain('v0.9.3')
  expect(versions).toContain('v0.9.1')
  expect(versions).not.toContain('Unreleased')
  expect(versions).not.toContain('v0.9.4')
  expect(versions.every(v => /^v\d/.test(v))).toBe(true)
})

test('shows a version/date stamp on the selected string', async ({ page }) => {
  await page.goto(`/strings?pack=${encodeURIComponent(PACK)}`)
  const stamp = page.getByTestId('string-stamp')
  await expect(stamp).toBeVisible()
  await expect(stamp).toHaveText(STAMP)
  await expect(stamp).toHaveText(/^Version \d/)
})

test('Copy writes the string to the clipboard and announces it via aria-live', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const expected = await packString(request)
  await page.goto(`/strings?pack=${encodeURIComponent(PACK)}`)
  await page.waitForLoadState('networkidle') // hydrated: click handlers attached
  const button = page.getByRole('button', { name: 'Copy string', exact: true })
  await expect(button).toBeVisible()
  const status = page.locator('.string-copy [role=status]').first()
  await expect(status).toHaveAttribute('aria-live', 'polite')
  await button.click()
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
  await expect(page.getByText('Copied to clipboard', { exact: true })).toHaveCount(1)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected)
  // Feedback is short-lived.
  await expect(page.getByRole('button', { name: 'Copy string', exact: true })).toBeVisible({ timeout: 6000 })
})

test('Copy falls back to execCommand when the Clipboard API is unavailable', async ({ page, request }) => {
  const expected = await packString(request)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    ;(window as unknown as { __copied: string[] }).__copied = []
    document.execCommand = (cmd: string) => {
      if (cmd === 'copy') {
        ;(window as unknown as { __copied: string[] }).__copied.push((document.activeElement as HTMLTextAreaElement).value)
        return true
      }
      return false
    }
  })
  await page.goto(`/strings?pack=${encodeURIComponent(PACK)}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Copy string', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual([expected])
})

test('Copy reports failure instead of claiming success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    document.execCommand = () => false
  })
  await page.goto(`/strings?pack=${encodeURIComponent(PACK)}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Copy string', exact: true }).click()
  await expect(page.getByText(/Could not copy/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toHaveCount(0)
})

test('guide explains how to apply only one module', async ({ page }) => {
  await page.goto('/guide')
  const section = page.locator('#apply-one-module')
  await expect(section.getByRole('heading', { name: 'Apply only one module' })).toBeVisible()
  await expect(section).toContainText('Apply Magguu profiles')
  await expect(section).toContainText('Import class layouts')
  await expect(section).toContainText('Import BigWigs profile')
  await expect(section.getByRole('link', { name: 'Strings' })).toHaveAttribute('href', '/strings')
})


const E2E_CLASS = 'Mage'
const E2E_SPEC = 'E2E Spec'
const E2E_CLASS_B = 'Warlock'
const E2E_SPEC_B = 'E2E Other Spec'
const E2E_LAYOUT_STRING = 'E2E-LAYOUT-STRING-TEST-CLASS'

function classOption(page: import('@playwright/test').Page, className: string) {
  return page.getByRole('listbox', { name: 'WoW classes' }).getByRole('option').filter({ hasText: className })
}

function specOption(page: import('@playwright/test').Page, spec: string) {
  return page.getByRole('listbox', { name: 'Specializations' }).getByRole('option', { name: spec, exact: true })
}

test('class and spec picker reflects the query and exposes listboxes', async ({ page }) => {
  await page.goto(`/strings?class=${encodeURIComponent(E2E_CLASS)}&spec=${encodeURIComponent(E2E_SPEC)}`)
  await hydrated(page)
  await expect(page.getByRole('heading', { name: 'Import Strings' })).toBeVisible()
  await expect(page.getByText('Class', { exact: true })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'WoW classes' })).toBeVisible()
  await expect(classOption(page, E2E_CLASS)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Specialization', { exact: true })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Specializations' })).toBeVisible()
  await expect(specOption(page, E2E_SPEC)).toHaveAttribute('aria-selected', 'true')
})

test('selecting another class updates the spec chips, the string card, and the URL', async ({ page }) => {
  await page.goto(`/strings?class=${encodeURIComponent(E2E_CLASS)}&spec=${encodeURIComponent(E2E_SPEC)}`)
  await hydrated(page)
  await classOption(page, E2E_CLASS_B).click()
  await expect(classOption(page, E2E_CLASS_B)).toHaveAttribute('aria-selected', 'true')
  await expect(classOption(page, E2E_CLASS)).toHaveAttribute('aria-selected', 'false')
  await expect(specOption(page, E2E_SPEC_B)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('region', { name: 'String preview' })).toBeVisible()
  await expect.poll(() => {
    const url = new URL(page.url())
    return `${url.searchParams.get('class')}|${url.searchParams.get('spec')}|${url.searchParams.get('tab')}`
  }).toBe(`${E2E_CLASS_B}|${E2E_SPEC_B}|null`)
})

test('string card shows preview, size, and no edit control while logged out', async ({ page, request }) => {
  const list = await (await request.get('/api/v1/layouts?view=meta')).json()
  const row = (list.data as { className: string, spec: string, importLength?: number }[])
    .find(l => l.className === E2E_CLASS && l.spec === E2E_SPEC)
  expect(row, 'E2E layout fixture must be seeded').toBeTruthy()
  await page.goto(`/strings?class=${encodeURIComponent(E2E_CLASS)}&spec=${encodeURIComponent(E2E_SPEC)}`)
  await hydrated(page)
  const preview = page.getByRole('region', { name: 'String preview' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText(E2E_LAYOUT_STRING)
  await expect(page.getByText(`${(row!.importLength ?? E2E_LAYOUT_STRING.length).toLocaleString('en-US')} characters`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy string', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit layout' })).toHaveCount(0)
})

test('layout Copy writes the fixture string to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(`/strings?class=${encodeURIComponent(E2E_CLASS)}&spec=${encodeURIComponent(E2E_SPEC)}`)
  await hydrated(page)
  await page.getByRole('button', { name: 'Copy string', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
  await expect(page.getByText('Copied to clipboard', { exact: true })).toHaveCount(1)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(E2E_LAYOUT_STRING)
  await expect(page.getByRole('button', { name: 'Copy string', exact: true })).toBeVisible({ timeout: 6000 })
})

test('an unknown class query selects the first class without rewriting the URL by itself', async ({ page, request }) => {
  const list = await (await request.get('/api/v1/layouts?view=meta')).json()
  const classes = [...new Set((list.data as { className?: string }[]).map(l => l.className).filter((c): c is string => Boolean(c)))].sort()
  expect(classes.length).toBeGreaterThan(0)
  const first = classes[0]!
  await page.goto('/strings?class=NotARealClass&spec=Nope')
  await hydrated(page)
  await expect(classOption(page, first)).toHaveAttribute('aria-selected', 'true')
  // syncUrl is not immediate: when layouts are already in the SSR payload the
  // selected class is stable at watch setup, so the unknown query stays until a pick.
  expect(new URL(page.url()).searchParams.get('class')).toBe('NotARealClass')
})

function interceptLayouts(page: import('@playwright/test').Page, handler: (route: import('@playwright/test').Route) => Promise<void>) {
  return page.route('**/api/v1/layouts**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/v1/layouts') {
      await handler(route)
      return
    }
    await route.continue()
  })
}

async function openStringsFromGuide(page: import('@playwright/test').Page) {
  await page.goto('/guide')
  await hydrated(page)
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Import Strings' }).click()
  await expect(page).toHaveURL(/\/strings/)
}

test('empty layouts list shows the empty state', async ({ page }) => {
  // First paint is SSR and ignores page.route; client-side nav from /guide is interceptable.
  await interceptLayouts(page, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  })
  await openStringsFromGuide(page)
  await expect(page.getByText('No layouts available yet.')).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'WoW classes' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'String preview' })).toHaveCount(0)
})

test('loading layouts shows the empty copy until the list arrives', async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  await interceptLayouts(page, async (route) => {
    await held
    await route.continue()
  })
  await openStringsFromGuide(page)
  await expect(page.getByText('No layouts available yet.')).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'WoW classes' })).toHaveCount(0)
  release()
  await expect(page.getByRole('listbox', { name: 'WoW classes' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('No layouts available yet.')).toHaveCount(0)
})

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: class picker and string card stay usable`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem('nuxt-color-mode', t), theme)
    await page.goto(`/strings?class=${encodeURIComponent(E2E_CLASS)}&spec=${encodeURIComponent(E2E_SPEC)}`)
    await hydrated(page)
    await expect(page.locator('html')).toHaveClass(new RegExp(theme))
    await expect(page.getByRole('heading', { name: 'Import Strings' })).toBeVisible()
    await expect(page.getByRole('listbox', { name: 'WoW classes' })).toBeVisible()
    await expect(classOption(page, E2E_CLASS)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('listbox', { name: 'Specializations' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'String preview' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy string', exact: true })).toBeVisible()
  })
}
