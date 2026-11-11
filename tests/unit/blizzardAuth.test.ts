import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  blizzardCredentialsFromConfig,
  getBlizzardAccessToken,
  resetBlizzardAccessTokenCache,
  sanitizeBlizzardLog,
} from '../../server/utils/blizzardAuth'
import {
  BLIZZARD_META_LOCK_TTL_MS,
  isBlizzardMetaLockHeld,
  releaseBlizzardMetaLock,
  resetBlizzardMetaLock,
  tryAcquireBlizzardMetaLock,
  withBlizzardMetaLock,
} from '../../server/utils/blizzardMetaLock'
import { blizzardRequest, createBlizzardTraffic, parseRetryAfterMs } from '../../server/utils/blizzardHttp'

describe('blizzard credentials and log redaction', () => {
  it('reads trimmed id and secret from runtimeConfig and rejects missing values', () => {
    assert.equal(blizzardCredentialsFromConfig({}), null)
    assert.equal(blizzardCredentialsFromConfig({ blizzardClientId: '  ', blizzardClientSecret: 'x' }), null)
    assert.deepEqual(
      blizzardCredentialsFromConfig({ blizzardClientId: '  id  ', blizzardClientSecret: ' secret ' }),
      { id: 'id', secret: 'secret' },
    )
  })

  it('redacts secrets, Bearer tokens and Basic headers from log text', () => {
    const text = sanitizeBlizzardLog(
      'Authorization: Bearer super-token and Basic abcdef and id=client-id secret=client-secret',
      ['client-id', 'client-secret'],
    )
    assert.doesNotMatch(text, /super-token|abcdef|client-id|client-secret/)
    assert.match(text, /\[redacted\]/)
  })

  it('caches a token until five minutes before it expires', async () => {
    resetBlizzardAccessTokenCache()
    let calls = 0
    const request = async () => {
      calls += 1
      return { access_token: 'tok', expires_in: 3600 }
    }
    const creds = { id: 'id', secret: 'secret' }
    const issued = 1_000
    assert.equal(await getBlizzardAccessToken(creds, request, issued), 'tok')
    assert.equal(await getBlizzardAccessToken(creds, request, issued + 240_000), 'tok')
    assert.equal(calls, 1)
    assert.equal(await getBlizzardAccessToken(creds, request, issued + 3_600_000 - 300_000), 'tok')
    assert.equal(calls, 2)
    resetBlizzardAccessTokenCache()
  })
})

describe('blizzard meta lock', () => {
  beforeEach(() => resetBlizzardMetaLock())

  it('lets one caller in and blocks the second until release', async () => {
    assert.equal(tryAcquireBlizzardMetaLock(1000), true)
    assert.equal(isBlizzardMetaLockHeld(1000), true)
    assert.equal(tryAcquireBlizzardMetaLock(1000), false)
    releaseBlizzardMetaLock()
    assert.equal(tryAcquireBlizzardMetaLock(1000), true)
    const again = await withBlizzardMetaLock(async () => 'nope', 1000)
    assert.deepEqual(again, { ok: false, reason: 'locked' })
    resetBlizzardMetaLock()
    const ok = await withBlizzardMetaLock(async () => 7, 1000)
    assert.deepEqual(ok, { ok: true, value: 7 })
  })

  it('expires a stuck hold after the TTL', () => {
    assert.equal(tryAcquireBlizzardMetaLock(1000), true)
    assert.equal(tryAcquireBlizzardMetaLock(1000 + BLIZZARD_META_LOCK_TTL_MS - 1), false)
    assert.equal(tryAcquireBlizzardMetaLock(1000 + BLIZZARD_META_LOCK_TTL_MS), true)
  })

  it('holds until the job deadline so a later clock still cannot overlap a running job', async () => {
    const start = 5_000
    const deadline = start + BLIZZARD_META_LOCK_TTL_MS + 60_000
    let t = start
    const first = await withBlizzardMetaLock(async () => {
      t = deadline - 1
      const nested = await withBlizzardMetaLock(async () => 'overlap', () => t, deadline)
      assert.deepEqual(nested, { ok: false, reason: 'locked' })
      return 'ok'
    }, () => t, deadline)
    assert.deepEqual(first, { ok: true, value: 'ok' })
  })

  it('releases the lock in finally after success and after a throw', async () => {
    const first = await withBlizzardMetaLock(async () => 'ok', 1000)
    assert.deepEqual(first, { ok: true, value: 'ok' })
    await assert.rejects(
      () => withBlizzardMetaLock(async () => { throw new Error('boom') }, 1000),
      /boom/,
    )
    const again = await withBlizzardMetaLock(async () => 2, 1000)
    assert.deepEqual(again, { ok: true, value: 2 })
  })
})

describe('Retry-After parsing', () => {
  it('reads seconds and caps the wait', () => {
    assert.equal(parseRetryAfterMs('2'), 2_000)
    assert.equal(parseRetryAfterMs('120'), 30_000)
    assert.equal(parseRetryAfterMs(null), 1_000)
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    assert.equal(parseRetryAfterMs('Thu, 01 Jan 2026 00:00:05 GMT', now), 5_000)
  })

  it('pauses later traffic until clock plus Retry-After, not until the raw wait', async () => {
    const t = 1_700_000_000_000
    const waits: number[] = []
    const sleep = async (ms: number) => { waits.push(ms) }
    const traffic = createBlizzardTraffic({ maxRps: 100, concurrency: 1, sleep, now: () => t })
    let calls = 0
    const fetcher = async () => {
      calls += 1
      if (calls === 1) {
        return {
          status: 429,
          headers: { get: (name: string) => name.toLowerCase() === 'retry-after' ? '2' : null },
          body: {},
        }
      }
      return { status: 200, headers: { get: () => null }, body: { ok: true } }
    }
    const res = await blizzardRequest(fetcher, { method: 'GET', url: 'https://example.test/meta', headers: {} }, {
      sleep,
      now: () => t,
      traffic,
      jitter: () => 0,
    })
    assert.equal(res.status, 200)
    assert.ok(
      waits.filter(ms => ms >= 2000).length >= 2,
      `expected retry wait plus a clock-based traffic pause, got ${waits.join(',')}`,
    )
  })
})
