import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

// The consent banner (shown while NUXT_VISITOR_LOG is on, see webServer.env) would sit over every page in the
// other specs, so they start with a stored "necessary only" choice. tests/consent.spec.ts starts clean instead.
const consentCookie = encodeURIComponent(JSON.stringify({ v: 1, stats: false, ts: Date.now() }))

export default defineConfig({
  testDir: 'tests',
  // Dev-server warm-up (see tests/support/warmup.ts)
  globalSetup: './tests/support/warmup.ts',
  testMatch: /.*\.spec\.ts/,
  retries: isCI ? 1 : 0,
  workers: 2,

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    storageState: {
      cookies: [{ name: 'mg_consent', value: consentCookie, domain: 'localhost', path: '/', expires: Math.floor(Date.now() / 1000) + 86400, httpOnly: false, secure: false, sameSite: 'Lax' }],
      origins: [],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    env: {
      NUXT_DEVTOOLS: 'false',
      NUXT_OG_IMAGE_SECRET: 'playwright-dummy-og-image-secret',
      // Admin E2E (tests/admin-content-live.spec.ts): a fresh DB creates `admin` with this password.
      // CI builds + verify:smoke first, which leaves data/magguuui.db with another
      // admin password; force-reset so the E2E login always matches this value.
      NUXT_ADMIN_PASSWORD: process.env.NUXT_ADMIN_PASSWORD || 'playwright-admin',
      NUXT_FORCE_PASSWORD_RESET: 'true',
      // Seeds one WowUp pack (server/plugins/e2e-seed.ts) for the lazy-strings test.
      NUXT_E2E_SEED: 'true',
      // Detailed visitor log (banner, consent, capture): off by default in production, on for tests/consent.spec.ts.
      NUXT_VISITOR_LOG: 'true',
      NUXT_JWT_SECRET: process.env.NUXT_JWT_SECRET || 'playwright-dummy-jwt-secret-32-chars-long-XXXXXXXX',
    },
    // Health probe: a cold SSR probe on / could hang past the timeout while
    // Vite optimizes deps. tests/support/warmup.ts then warms the pages.
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
