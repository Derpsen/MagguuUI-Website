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
import { parseRetryAfterMs } from '../../server/utils/blizzardHttp'

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

  it('caches a token until shortly before it expires', async () => {
    resetBlizzardAccessTokenCache()
    let calls = 0
    const request = async () => {
      calls += 1
      return { access_token: 'tok', expires_in: 120 }
    }
    const creds = { id: 'id', secret: 'secret' }
    assert.equal(await getBlizzardAccessToken(creds, request, 1_000), 'tok')
    assert.equal(await getBlizzardAccessToken(creds, request, 10_000), 'tok')
    assert.equal(calls, 1)
    assert.equal(await getBlizzardAccessToken(creds, request, 1_000 + 120_000), 'tok')
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
})

describe('Retry-After parsing', () => {
  it('reads seconds and caps the wait', () => {
    assert.equal(parseRetryAfterMs('2'), 2_000)
    assert.equal(parseRetryAfterMs('120'), 30_000)
    assert.equal(parseRetryAfterMs(null), 1_000)
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    assert.equal(parseRetryAfterMs('Thu, 01 Jan 2026 00:00:05 GMT', now), 5_000)
  })
})
