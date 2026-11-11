/**
 * Admin tab bar overflow + Settings build SHA.
 * One login per run (login is rate-limited). Fresh page per viewport/theme so init scripts stay isolated.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'

const SEEDED_TABS = [
  { path: '/admin', label: 'Dashboard', icon: 'i-heroicons-squares-2x2', pinned: true },
  { path: '/admin/system/activity', label: 'Activity', pinned: false },
  { path: '/admin/system/stats', label: 'Statistics', pinned: false },
  { path: '/admin/system/github', label: 'GitHub', pinned: false },
  { path: '/admin/system/settings', label: 'Settings', pinned: false },
  { path: '/admin/system/vitals', label: 'Vitals', pinned: false },
  { path: '/admin/strings/profiles', label: 'Profiles', pinned: false },
  { path: '/admin/strings/layouts', label: 'Layouts', pinned: false },
  { path: '/admin/data/addons', label: 'Addons', pinned: false },
  { path: '/admin/system/visitors', label: 'Visitors', pinned: false },
  { path: '/admin/content/home', label: 'Home content', pinned: false },
  { path: '/admin/content/faq', label: 'FAQ editor', pinned: false },
  { path: '/admin/content/changelog', label: 'Changelog', pinned: false },
  { path: '/admin/strings/wowup', label: 'WowUp strings', pinned: false },
  { path: '/admin/strings/community', label: 'Community', pinned: false },
]

let context: BrowserContext

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  const res = await context.request.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  await context?.close()
})

async function openCommunity(width: number, theme: 'light' | 'dark'): Promise<Page> {
  const page = await context.newPage()
  await page.setViewportSize({ width, height: width <= 400 ? 844 : 800 })
  await page.addInitScript(([mode, tabs]) => {
    localStorage.setItem('nuxt-color-mode', mode)
    localStorage.setItem('admin-tabs', JSON.stringify(tabs))
  }, [theme, SEEDED_TABS] as const)
  await page.goto('/admin/strings/community')
  await expect(page.getByTestId('admin-tab-bar')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /light/)
  return page
}

async function revealCommunity(page: Page) {
  const tab = page.getByTestId('admin-tab').filter({ hasText: 'Community' })
  await expect(tab).toHaveCount(1)
  const scroller = page.getByTestId('admin-tab-scroller')
  const right = page.getByTestId('admin-tab-scroll-right')
  for (let i = 0; i < 16; i++) {
    const tabBox = await tab.boundingBox()
    const scrollerBox = await scroller.boundingBox()
    if (tabBox && scrollerBox && tabBox.x >= scrollerBox.x - 1 && tabBox.x + tabBox.width <= scrollerBox.x + scrollerBox.width + 1) {
      return
    }
    if (!(await right.isVisible())) break
    await right.click()
    await page.waitForTimeout(150)
  }
  const tabBox = await tab.boundingBox()
  const scrollerBox = await scroller.boundingBox()
  expect(tabBox, 'Community tab should have a box').toBeTruthy()
  expect(scrollerBox, 'tab scroller should have a box').toBeTruthy()
  expect(tabBox!.x).toBeGreaterThanOrEqual(scrollerBox!.x - 1)
  expect(tabBox!.x + tabBox!.width).toBeLessThanOrEqual(scrollerBox!.x + scrollerBox!.width + 1)
}

const cases: Array<{ width: number, theme: 'light' | 'dark' }> = [
  { width: 1280, theme: 'dark' },
  { width: 1280, theme: 'light' },
  { width: 390, theme: 'dark' },
  { width: 390, theme: 'light' },
]

for (const { width, theme } of cases) {
  test(`tab bar keeps Community reachable at ${width}px ${theme}`, async () => {
    const page = await openCommunity(width, theme)
    try {
      await expect.poll(() => page.getByTestId('admin-tab').count()).toBe(SEEDED_TABS.length)
      for (const tab of SEEDED_TABS) {
        await expect(page.getByTestId('admin-tab').filter({ hasText: tab.label })).toHaveCount(1)
      }
      // Seeded tabs overflow the bar at both 1280 (sidebar) and 390, so fade/arrows must appear.
      await expect.poll(async () =>
        (await page.getByTestId('admin-tab-scroll-right').isVisible())
        || (await page.getByTestId('admin-tab-scroll-left').isVisible()),
      ).toBe(true)
      if (await page.getByTestId('admin-tab-scroll-right').isVisible()) {
        await expect(page.getByTestId('admin-tab-fade-right')).toBeVisible()
      }
      if (await page.getByTestId('admin-tab-scroll-left').isVisible()) {
        await expect(page.getByTestId('admin-tab-fade-left')).toBeVisible()
      }
      await revealCommunity(page)
    } finally {
      await page.close()
    }
  })
}

test('Settings header shows the app version and build SHA', async () => {
  const page = await context.newPage()
  try {
    await page.goto('/admin/system/settings')
    const line = page.getByTestId('admin-settings-build')
    await expect(line).toBeVisible({ timeout: 30_000 })
    await expect(line).toContainText(/^App 3\.0\.0 · (dev|sha-[0-9a-f]{7})$/)
  } finally {
    await page.close()
  }
})

test('arrow keys move between tabs; reduced-motion still reaches Community', async () => {
  const page = await context.newPage()
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript(([tabs]) => {
      localStorage.setItem('admin-tabs', JSON.stringify(tabs))
    }, [SEEDED_TABS])
    await page.goto('/admin/strings/community')
    await expect(page.getByTestId('admin-tab-bar')).toBeVisible({ timeout: 30_000 })
    const community = page.getByTestId('admin-tab').filter({ hasText: 'Community' })
    await community.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/\/admin\/strings\/wowup/)
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/\/admin\/strings\/community/)
    await expect(community).toBeFocused()
  } finally {
    await page.close()
  }
})
