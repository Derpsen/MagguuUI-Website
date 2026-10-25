import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { hydrated } from './support/hydrated'

/**
 * Header and footer: every link has a real href, and every link and button (icon-only ones included) has an accessible
 * name. The contact link is a mailto: built after mount (so Cloudflare Email Obfuscation has nothing to rewrite) and
 * falls back to the legal notice until then.
 */

async function unnamed(page: Page) {
  return page.evaluate(() => {
    const name = (el: Element) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent || el.textContent || el.getAttribute('title') || '').trim()
    return [...document.querySelectorAll('header a, header button, footer a, footer button')]
      .filter(el => !name(el) || (el.tagName === 'A' && !el.getAttribute('href')))
      .map(el => `${el.tagName.toLowerCase()} ${el.outerHTML.slice(0, 120)}`)
  })
}

test('server HTML: the contact link already has an href', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const tag = html.match(/<a\b[^>]*data-cta="footer-contact"[^>]*>/)?.[0]
  expect(tag, 'footer contact link in the server HTML').toBeTruthy()
  expect(tag).toMatch(/href="\/imprint"/)
})

for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test(`${name}: contact is a mailto after hydration, no unnamed link or button in header/footer`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await hydrated(page)
    const contact = page.locator('footer a[data-cta="footer-contact"]')
    await expect(contact).toHaveAttribute('href', /^mailto:contact@magguu\.xyz$/)
    expect(await unnamed(page)).toEqual([])
    await page.screenshot({ path: `test-results/layout-links-${name}.png`, fullPage: true })
    if (name === 'mobile') {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible()
      const inDialog = await page.getByRole('dialog').locator('a, button').evaluateAll(els => els
        .filter(el => !(el.getAttribute('aria-label') || el.textContent || '').trim() || (el.tagName === 'A' && !el.getAttribute('href')))
        .map(el => el.outerHTML.slice(0, 120)))
      expect(inDialog).toEqual([])
    }
  })
}
