/**
 * Admin GitHub page: last scheduled nightly run (ok/error/skipped/partial, time, reason).
 * One login per run (login is rate-limited).
 */
import { expect, test, type BrowserContext } from '@playwright/test'
import Database from 'better-sqlite3'
import { join } from 'node:path'

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin'
const DB_PATH = join(process.cwd(), 'data', 'magguuui.db')
const KEYS = ['github_scheduled_last_at', 'github_scheduled_last_status', 'github_scheduled_last_reason'] as const

let context: BrowserContext
const previous = new Map<string, string | null>()

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(DB_PATH, { fileMustExist: true })
  try { db.pragma('busy_timeout = 5000'); return fn(db) } finally { db.close() }
}

function upsertSetting(key: string, value: string) {
  withDb((db) => {
    const row = db.prepare('SELECT id FROM settings WHERE key = ?').get(key) as { id: number } | undefined
    if (row) db.prepare('UPDATE settings SET value = ?, updated_at = unixepoch() WHERE key = ?').run(value, key)
    else db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value)
  })
}

function snapshotAndClear() {
  withDb((db) => {
    previous.clear()
    for (const key of KEYS) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
      previous.set(key, row?.value ?? null)
      db.prepare('DELETE FROM settings WHERE key = ?').run(key)
    }
  })
}

function restore() {
  withDb((db) => {
    for (const key of KEYS) {
      const value = previous.get(key)
      if (value == null) db.prepare('DELETE FROM settings WHERE key = ?').run(key)
      else {
        const row = db.prepare('SELECT id FROM settings WHERE key = ?').get(key) as { id: number } | undefined
        if (row) db.prepare('UPDATE settings SET value = ?, updated_at = unixepoch() WHERE key = ?').run(value, key)
        else db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value)
      }
    }
  })
}

test.beforeAll(async ({ browser }) => {
  snapshotAndClear()
  context = await browser.newContext()
  const res = await context.request.post('/api/v1/auth/login', { data: { username: ADMIN_USER, password: ADMIN_PASSWORD } })
  expect(res.ok(), `admin login → ${res.status()}`).toBe(true)
})

test.afterAll(async () => {
  restore()
  await context?.close()
})

test('GitHub page shows no scheduled run, then the stored ok/error/skipped status', async () => {
  const page = await context.newPage()
  try {
    await page.goto('/admin/system/github')
    const line = page.getByTestId('admin-github-scheduled')
    await expect(line).toBeVisible({ timeout: 30_000 })
    await expect(line).toContainText('No scheduled run yet')
    await expect(page.getByTestId('admin-github-scheduled-panel')).toContainText('No scheduled run yet')

    upsertSetting('github_scheduled_last_at', '2026-11-12T02:30:00.000Z')
    upsertSetting('github_scheduled_last_status', 'ok')
    upsertSetting('github_scheduled_last_reason', 'Release 12.1.9; catalogue inserted=0, updated=2, removed=0')
    await page.reload()
    await expect(line).toContainText(/Scheduled ok/, { timeout: 30_000 })
    // 2026-11-12T02:30:00.000Z is 03:30 CET — display is always Europe/Berlin, not container TZ.
    await expect(line).toContainText('12/11/2026, 03:30 CET')
    await expect(line).toContainText('Release 12.1.9')
    await expect(page.getByTestId('admin-github-scheduled-panel')).toContainText('ok')
    await expect(page.getByTestId('admin-github-scheduled-panel')).toContainText('12/11/2026, 03:30 CET')
    await expect(page.getByTestId('admin-github-scheduled-panel')).toContainText('catalogue inserted=0')
    const next = page.getByTestId('admin-github-scheduled-next')
    await expect(next).toBeVisible()
    await expect(next).toContainText(/Next \d{2}\/\d{2}\/\d{4}, 0[34]:30 CES?T/)

    upsertSetting('github_scheduled_last_status', 'error')
    upsertSetting('github_scheduled_last_reason', 'GitHub rate limit reached; retry after 2026-11-12T03:00:00.000Z')
    await page.reload()
    await expect(line).toContainText(/Scheduled error/, { timeout: 30_000 })
    await expect(line).toContainText('rate limit')

    upsertSetting('github_scheduled_last_status', 'partial')
    upsertSetting('github_scheduled_last_reason', 'Release check failed: timeout; catalogue inserted=1, updated=0, removed=0')
    await page.reload()
    await expect(line).toContainText(/Scheduled partial/, { timeout: 30_000 })
    await expect(line).toContainText('catalogue inserted=1')

    upsertSetting('github_scheduled_last_status', 'skipped')
    upsertSetting('github_scheduled_last_reason', 'Disabled (NUXT_GITHUB_NIGHTLY is off)')
    await page.reload()
    await expect(line).toContainText(/Scheduled skipped/, { timeout: 30_000 })
    await expect(line).toContainText('NUXT_GITHUB_NIGHTLY is off')
  } finally {
    await page.close()
  }
})
