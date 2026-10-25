import { expect, test } from '@playwright/test'

/** The draft/publish endpoints are admin-only: every handler answers 401 without a session. */
test.describe('content draft endpoints require auth', () => {
  const body = { pages: ['about'], items: [{ page: 'about', section: 'intro', key: 'title', value: 'x' }] }

  test('GET drafts → 401', async ({ request }) => {
    expect((await request.get('/api/v1/admin/content/drafts?pages=about')).status()).toBe(401)
  })
  test('POST drafts → 401', async ({ request }) => {
    expect((await request.post('/api/v1/admin/content/drafts', { data: body })).status()).toBe(401)
  })
  test('DELETE drafts → 401', async ({ request }) => {
    expect((await request.delete('/api/v1/admin/content/drafts?pages=about')).status()).toBe(401)
  })
  test('POST publish → 401', async ({ request }) => {
    expect((await request.post('/api/v1/admin/content/publish', { data: { pages: ['about'] } })).status()).toBe(401)
  })
  test('legacy bulk → 401', async ({ request }) => {
    expect((await request.post('/api/v1/admin/content/bulk', { data: { items: body.items } })).status()).toBe(401)
  })
})
