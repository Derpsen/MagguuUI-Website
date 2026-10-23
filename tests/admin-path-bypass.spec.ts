import { expect, test } from '@playwright/test'

/**
 * Encoded / non-canonical spellings of /api/v1/admin must hit the same JWT
 * gate as the plain path (security audit 2026-10-23). Unauthenticated only.
 */
const READ_ROUTE = 'stats'
const variants = [
  `/api/v1/admin/${READ_ROUTE}`,
  `/api/v1/%61dmin/${READ_ROUTE}`,
  `/api/v1/%2561dmin/${READ_ROUTE}`,
  `/api/v1//admin/${READ_ROUTE}`,
  `/api/v1/Admin/${READ_ROUTE}`,
  `/api/v1/ADMIN/${READ_ROUTE}`,
  `/api/v1/x/..%2fadmin/${READ_ROUTE}`,
  `/api/v1/x/..%2Fadmin/${READ_ROUTE}`,
  `/api/v1/%2e%2e/v1/admin/${READ_ROUTE}`,
  `/api/v1/admin%2f${READ_ROUTE}`,
]

for (const path of variants) {
  test(`unauthenticated ${path} is rejected`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 })
    expect([401, 403], `${path} → ${res.status()}`).toContain(res.status())
  })
}

test('unauthenticated write via encoded path is rejected', async ({ request }) => {
  const res = await request.post('/api/v1/%61dmin/faqs/reorder', { data: { ids: [] } })
  expect([401, 403]).toContain(res.status())
})
