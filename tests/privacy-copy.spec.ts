import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

// L3 / L4: the rendered policy shows the real retention number (no raw placeholder) and no claim of an anonymized IP address.
test('privacy page: retention number is filled in, section 4 does not call the IP anonymized', async ({ page, request }) => {
  await page.goto('/privacy')
  await hydrated(page)
  const s7 = page.getByTestId('privacy-s7')
  await expect(s7).toContainText(/Page load measurements are deleted after \d+ days\./)
  const setting = (await (await request.get('/api/v1/settings')).json()).data.data_retention_days
  await expect(s7).toContainText(`deleted after ${setting} days`)
  const s4 = page.getByTestId('privacy-s4')
  await expect(s4).toContainText('IP address (the full address; it is not shortened or anonymized)')
  await expect(s4).not.toContainText('IP address (anonymized)')
  expect(await page.locator('article').innerText()).not.toContain('{{')
})
