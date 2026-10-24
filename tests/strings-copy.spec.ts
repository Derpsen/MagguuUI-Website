import { expect, test } from '@playwright/test'

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
