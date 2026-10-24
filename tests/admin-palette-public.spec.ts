import { expect, test } from '@playwright/test'

/** The admin Ctrl/Cmd+K palette must not exist on public pages or the login screen. */
test('Ctrl+K on the public site opens the public search, never the admin palette', async ({ page }) => {
  await page.goto('/guide')
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Control+k')
  await expect(page.getByTestId('public-search')).toBeVisible()
  await expect(page.getByTestId('admin-command')).toHaveCount(0)
})

test('unauthenticated /admin redirects to login and offers no palette', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.keyboard.press('Control+k')
  await page.keyboard.press('Meta+k')
  await expect(page.getByTestId('admin-command')).toHaveCount(0)
  await expect(page.getByRole('combobox')).toHaveCount(0)
})
