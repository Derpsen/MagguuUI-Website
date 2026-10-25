import { defineConfig, devices } from '@playwright/test'

/**
 * Walkthrough against the LIVE site (GET only). Not part of the normal test run: the default config only matches tests/*.spec.ts.
 *   LIVE_URL=https://ui.magguu.xyz npx playwright test -c playwright.live.config.ts
 * Every POST/PUT/PATCH/DELETE is aborted by the spec, except the consent calls of the two isolated tests (see live/walkthrough.live.ts).
 * No admin login, no preset form submit.
 */
export default defineConfig({
  testDir: 'live',
  testMatch: /.*\.live\.ts/,
  retries: 0,
  workers: 2,
  timeout: 90_000,
  reporter: [['list'], ['json', { outputFile: '/tmp/live-report.json' }]],
  use: {
    baseURL: process.env.LIVE_URL || 'https://ui.magguu.xyz',
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
