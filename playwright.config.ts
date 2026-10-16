import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts/,
  retries: isCI ? 1 : 0,
  workers: 2,

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
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
      NUXT_JWT_SECRET: process.env.NUXT_JWT_SECRET || 'playwright-dummy-jwt-secret-32-chars-long-XXXXXXXX',
    },
    // Probe the API, not an SSR page: the first SSR request can hang while
    // Vite re-optimizes deps, and Playwright's probe then never resolves.
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
