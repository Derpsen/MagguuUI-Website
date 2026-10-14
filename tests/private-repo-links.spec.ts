import { expect, test } from '@playwright/test'

// Derpsen/MagguuUI is a private repo; public pages must not link to it.
for (const path of ['/', '/guide', '/faq', '/about', '/changelog']) {
  test(`no private repo links on ${path}`, async ({ page }) => {
    await page.goto(path)
    const hrefs = await page.locator('a[href]').evaluateAll(els => els.map(e => (e as HTMLAnchorElement).href))
    expect(hrefs.filter(h => /github\.com\/Derpsen\/MagguuUI(?![\w.-])/i.test(h))).toEqual([])
  })
}
