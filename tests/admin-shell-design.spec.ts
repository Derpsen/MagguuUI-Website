import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

/**
 * Redesign PR 5a: admin shell (sidebar, header, tab bar) and dashboard on the design tokens. One login per run (login is
 * rate-limited); a fresh page per viewport/theme.
 */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'

let context: BrowserContext

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  const res = await context.request.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  await context?.close()
})

const UNPINNED_TABS = [
  { path: '/admin', label: 'Dashboard', icon: 'i-heroicons-squares-2x2', pinned: true },
  { path: '/admin/system/activity', label: 'Activity', pinned: false },
]

async function openDashboard(width: number, theme: 'light' | 'dark', path = '/admin'): Promise<Page> {
  const page = await context.newPage()
  await page.setViewportSize({ width, height: width <= 400 ? 844 : 800 })
  await page.addInitScript(([mode, tabs]) => {
    localStorage.setItem('nuxt-color-mode', mode)
    localStorage.setItem('admin-tabs', JSON.stringify(tabs))
  }, [theme, UNPINNED_TABS] as const)
  await page.goto(path)
  await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('dash-content')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /light/)
  await expect(page.getByTestId('admin-tab').filter({ hasText: 'Activity' })).toBeVisible()
  return page
}

for (const theme of ['dark', 'light'] as const) {
  test(`dashboard (${theme}): the shell uses the design tokens, not its own palette`, async () => {
    const page = await openDashboard(1280, theme)
    const probe = await page.evaluate(() => {
      const shell = document.querySelector('.admin-shell') as HTMLElement
      const resolve = (prop: string, v: string) => {
        const el = document.createElement('span')
        el.style.cssText = `position:absolute;visibility:hidden;${prop}:${v}`
        shell.appendChild(el)
        const out = getComputedStyle(el).getPropertyValue(prop)
        el.remove()
        return out
      }
      const css = (sel: string, prop: string) => getComputedStyle(document.querySelector(sel) as HTMLElement).getPropertyValue(prop)
      return {
        aside: css('.admin-shell aside', 'background-color'),
        surface: resolve('background-color', 'var(--mg-surface)'),
        main: css('main.admin-main', 'background-color'),
        bg: resolve('background-color', 'var(--mg-bg)'),
        label: css('.admin-dash__label', 'color'),
        accentText: resolve('color', 'var(--mg-accent-text)'),
        title: css('.admin-dash__title', 'color'),
        fg: resolve('color', 'var(--mg-fg)'),
        border: css('.admin-dash__row', 'border-top-color'),
        line: resolve('color', 'var(--mg-line)'),
      }
    })
    expect(probe.aside, 'sidebar background').toBe(probe.surface)
    expect(probe.main, 'main background').toBe(probe.bg)
    expect(probe.label, 'green mini-label colour').toBe(probe.accentText)
    expect(probe.title, 'title colour').toBe(probe.fg)
    expect(probe.border, 'hairline colour').toBe(probe.line)
    await page.close()
  })

  test(`dashboard (${theme}): axe finds no WCAG 2.x A/AA violation`, async () => {
    const page = await openDashboard(1280, theme)
    await expect(page.getByRole('button', { name: 'Close tab Activity' })).toBeAttached()
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
    await page.close()
  })

  for (const width of [320, 360, 390]) {
    test(`dashboard (${theme}): nothing overflows a ${width}px viewport`, async () => {
      const page = await openDashboard(width, theme)
      const offenders = await page.evaluate((vw) => {
        const out: string[] = []
        for (const el of Array.from(document.querySelectorAll('header, main, main *, .admin-mobile-dock, .admin-mobile-dock *'))) {
          const r = el.getBoundingClientRect()
          if (r.width <= 1 && r.height <= 1) continue
          let scroller = false
          for (let a = el.parentElement; a && a.tagName !== 'BODY'; a = a.parentElement) {
            const o = getComputedStyle(a).overflowX
            if (o === 'auto' || o === 'scroll') { scroller = true; break }
          }
          if (scroller) continue
          if (r.right > vw + 0.5 || r.left < -0.5) out.push(`${el.tagName}.${(el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.')} ${Math.round(r.left)}..${Math.round(r.right)}`)
        }
        return out.slice(0, 8)
      }, width)
      expect(offenders).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.evaluate(() => document.fonts.ready)
      const nav = await page.locator('header nav[aria-label="Breadcrumb"]').boundingBox()
      const search = await page.locator('header button.md\\:hidden[aria-label="Open command palette"]').boundingBox()
      expect(nav && search, 'breadcrumb and mobile search should be visible').toBeTruthy()
      expect((nav!.x + nav!.width) - search!.x).toBeLessThanOrEqual(0.5)
      await expect(page.locator('header button.vben-header-btn[aria-label="Settings"]')).toBeHidden()
      await expect(page.locator('header button.vben-header-btn[aria-label="Enter fullscreen"]')).toBeHidden()
      const more = page.getByRole('button', { name: 'More actions' })
      await expect(more).toBeVisible()
      await more.click()
      const panel = page.locator('#admin-header-more-panel')
      await expect(panel.getByRole('button', { name: 'Settings' })).toBeVisible()
      await expect(panel.getByRole('button', { name: 'Enter fullscreen' })).toBeVisible()
      const last = page.getByTestId('admin-breadcrumb-current')
      await expect(last).toBeVisible()
      const crumb = await last.evaluate((el) => {
        const s = getComputedStyle(el)
        return { textOverflow: s.textOverflow, overflow: s.overflow, clientWidth: el.clientWidth }
      })
      expect(crumb.textOverflow).toBe('ellipsis')
      expect(crumb.overflow).toMatch(/hidden/)
      expect(crumb.clientWidth).toBeGreaterThan(0)
      await panel.getByRole('button', { name: 'Settings' }).click()
      await expect(page.getByText('Compact sidebar')).toBeVisible()
      await page.close()
    })
  }

  test(`More actions (${theme}): Escape closes the disclosure and returns focus`, async () => {
    const page = await openDashboard(390, theme)
    const more = page.getByRole('button', { name: 'More actions' })
    await more.click()
    const panel = page.locator('#admin-header-more-panel')
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: 'Settings' }).focus()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(more).toBeFocused()
    await page.close()
  })

  test(`More actions (${theme}): focus leaving the panel closes it`, async () => {
    const page = await openDashboard(390, theme)
    const more = page.getByRole('button', { name: 'More actions' })
    await more.click()
    const panel = page.locator('#admin-header-more-panel')
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: 'Enter fullscreen' }).focus()
    await page.keyboard.press('Tab')
    await expect(panel).toHaveCount(0)
    await page.close()
  })

  test(`settings drawer (${theme}): Escape closes it and returns focus`, async () => {
    const page = await openDashboard(1280, theme)
    const settings = page.locator('header button.vben-header-btn[aria-label="Settings"]')
    await settings.click()
    await expect(page.getByText('Compact sidebar')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Compact sidebar')).toHaveCount(0)
    await expect(settings).toBeFocused()
    await page.close()
  })

  test(`settings drawer (${theme}, mobile): Escape returns focus to More actions`, async () => {
    const page = await openDashboard(390, theme)
    const more = page.getByRole('button', { name: 'More actions' })
    await more.click()
    await page.locator('#admin-header-more-panel').getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByText('Compact sidebar')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Compact sidebar')).toHaveCount(0)
    await expect(more).toBeFocused()
    await page.close()
  })

  test(`settings drawer (${theme}): axe finds no WCAG 2.x A/AA violation while open`, async () => {
    const page = await openDashboard(1280, theme)
    await page.getByTestId('admin-settings-trigger').click()
    const drawer = page.getByTestId('admin-settings-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    const axe = await new AxeBuilder({ page }).include('[data-testid="admin-settings-drawer"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
    await page.close()
  })

  test(`settings drawer (${theme}): focus moves in on open and returns on Close`, async () => {
    const page = await openDashboard(1280, theme)
    const settings = page.getByTestId('admin-settings-trigger')
    await settings.click()
    const drawer = page.getByTestId('admin-settings-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close settings' })).toBeFocused()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(drawer).toHaveCount(0)
    await expect(settings).toBeFocused()
    await page.close()
  })

  test(`settings drawer (${theme}): close after a resize to desktop focuses the gear`, async () => {
    const page = await openDashboard(390, theme)
    const more = page.getByRole('button', { name: 'More actions' })
    await more.click()
    await page.locator('#admin-header-more-panel').getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByTestId('admin-settings-drawer')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByTestId('admin-settings-trigger')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('admin-settings-drawer')).toHaveCount(0)
    await expect(page.getByTestId('admin-settings-trigger')).toBeFocused()
    await page.close()
  })

  test(`fullscreen (${theme}): keyboard toggle keeps focus on the control`, async () => {
    const page = await openDashboard(1280, theme)
    const toggle = page.getByTestId('admin-fullscreen-trigger')
    await toggle.focus()
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(toggle).toBeFocused()
    await page.close()
  })
}
