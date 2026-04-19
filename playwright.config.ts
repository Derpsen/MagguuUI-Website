import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: 'tests',
  retries: isCI ? 1 : 0,
  workers: 2,
  screenshot: 'only-on-failure',

  use: {
    baseURL: 'http://localhost:3000',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
