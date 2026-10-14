import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CDN_CACHE_CONTROL, isCdnCacheable, browserCacheControl, BROWSER_REVALIDATE_CACHE_CONTROL } from '../../server/utils/publicCache'
import { cloudflarePurgeConfigured, purgeCloudflareCache } from '../../server/utils/cloudflarePurge'

describe('edge cache headers', () => {
  it('lets Cloudflare cache public pages and catalog-summary for 120s + SWR', () => {
    assert.equal(CDN_CACHE_CONTROL, 'public, max-age=120, stale-while-revalidate=600')
    for (const path of ['/', '/guide', '/faq/', '/api/v1/catalog-summary']) {
      assert.equal(isCdnCacheable('GET', path, 200), true, path)
    }
  })

  it('never edge-caches admin, auth, sync, writes, errors, or query variants', () => {
    assert.equal(isCdnCacheable('GET', '/admin', 200), false)
    assert.equal(isCdnCacheable('GET', '/admin/login', 200), false)
    assert.equal(isCdnCacheable('GET', '/api/v1/admin/stats', 200), false)
    assert.equal(isCdnCacheable('GET', '/api/v1/auth/me', 200), false)
    assert.equal(isCdnCacheable('POST', '/api/v1/catalog-summary', 200), false)
    assert.equal(isCdnCacheable('GET', '/', 404), false)
    assert.equal(isCdnCacheable('GET', '/?utm=x', 200), false)
    assert.equal(isCdnCacheable('GET', '/strings', 200), false)
  })

  it('browsers keep revalidating every visit', () => {
    assert.equal(browserCacheControl('s-maxage=120, stale-while-revalidate'), BROWSER_REVALIDATE_CACHE_CONTROL)
    assert.match(BROWSER_REVALIDATE_CACHE_CONTROL, /max-age=0, must-revalidate/)
  })
})

describe('Cloudflare purge', () => {
  it('is a no-op without zone + token', async () => {
    let called = false
    const fake = async () => { called = true; return { ok: true, status: 200, text: async () => '' } }
    assert.equal(cloudflarePurgeConfigured({}), false)
    assert.equal(await purgeCloudflareCache({ CLOUDFLARE_ZONE_ID: 'z' }, fake), 'skipped')
    assert.equal(called, false)
  })

  it('posts purge_everything to the zone with the bearer token', async () => {
    const calls: Array<{ url: string, init: { method: string, headers: Record<string, string>, body: string } }> = []
    const fake = async (url: string, init: { method: string, headers: Record<string, string>, body: string }) => {
      calls.push({ url, init })
      return { ok: true, status: 200, text: async () => '{"success":true}' }
    }
    assert.equal(await purgeCloudflareCache({ CLOUDFLARE_ZONE_ID: 'zone1', CLOUDFLARE_API_TOKEN: 'tok' }, fake), 'purged')
    assert.equal(calls[0]?.url, 'https://api.cloudflare.com/client/v4/zones/zone1/purge_cache')
    assert.equal(calls[0]?.init.method, 'POST')
    assert.equal(calls[0]?.init.headers.Authorization, 'Bearer tok')
    assert.deepEqual(JSON.parse(calls[0]?.init.body || '{}'), { purge_everything: true })
  })

  it('reports failures without throwing', async () => {
    const fake = async () => ({ ok: false, status: 403, text: async () => 'forbidden' })
    assert.equal(await purgeCloudflareCache({ CLOUDFLARE_ZONE_ID: 'z', CLOUDFLARE_API_TOKEN: 't' }, fake), 'failed')
  })
})
