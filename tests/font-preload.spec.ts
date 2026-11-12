import { expect, test } from '@playwright/test'

/** Per-route font preloads (utils/fontPreload.ts): public pages preload the five faces they draw, the admin login three. */
test('font preload set follows the route: public pages five faces, admin login three', async ({ page }) => {
  const preloads = async (path: string) => {
    await page.goto(path)
    return page.evaluate(() => Array.from(document.querySelectorAll('link[rel="preload"][as="font"]')).map(l => (l as HTMLLinkElement).href))
  }
  expect(await preloads('/')).toHaveLength(5)
  expect(await preloads('/meta')).toHaveLength(5)
  expect(await preloads('/admin/login')).toHaveLength(3)
})
