import { chromium } from '@playwright/test'

/**
 * Dev-server warm-up before any test. On a cold `nuxt dev`, Vite discovers
 * lazily imported deps (web-vitals, tiptap, echarts, ...) on first use,
 * re-optimizes and force-reloads open pages, so early tests saw
 * net::ERR_ABORTED. Visit the public pages and the admin SPA until two rounds
 * in a row finish without an aborted navigation.
 */
const PATHS = ['/', '/imprint', '/guide', '/strings', '/changelog', '/admin/login', '/admin']

export default async function warmup() {
  const base = 'http://localhost:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const deadline = Date.now() + 180_000
  let clean = 0
  while (clean < 2) {
    if (Date.now() > deadline) throw new Error('dev-server warm-up did not settle in 180s')
    let ok = true
    for (const path of PATHS) {
      try {
        await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60_000 })
      }
      catch {
        ok = false
      }
    }
    clean = ok ? clean + 1 : 0
  }
  await browser.close()
}
