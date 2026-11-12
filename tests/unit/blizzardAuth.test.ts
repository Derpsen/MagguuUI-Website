import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blizzardCredentialsFromConfig,
  getBlizzardAccessToken,
  resetBlizzardAccessTokenCache,
  sanitizeBlizzardLog,
} from '../../server/utils/blizzardAuth'
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

describe('traffic gate respects a mid-wait pause', () => {
  it('does not let a waiting request fire through a Retry-After pause on a stale slot', async () => {
    let t = 0
    const pending: Array<() => void> = []
    const sleep = (ms: number) => new Promise<void>((resolve) => {
      pending.push(() => { t += ms; resolve() })
    })
    const traffic = createBlizzardTraffic({
      maxRps: 10,
      concurrency: 2,
      sleep,
      now: () => t,
    })
    const fired: number[] = []
    const first = traffic.run(async () => { fired.push(t) })
    await first
    assert.deepEqual(fired, [0])

    let secondFired = false
    const second = traffic.run(async () => { secondFired = true; fired.push(t) })
    assert.equal(pending.length, 1, 'second request should be waiting for its rate-gate slot')
    traffic.pauseUntil(1000)
    pending.shift()?.()
    await Promise.resolve()
    assert.equal(secondFired, false, 'stale slot must not fire during the pause')
    // The waiter re-checks and sleeps the remaining pause.
    assert.equal(pending.length, 1)
    pending.shift()?.()
    await second
    assert.equal(secondFired, true)
    assert.ok(fired[1]! >= 1000, `second fire was at ${fired[1]}`)
  })

  it('halves the current rate after a throttle and later recovers toward the target', async () => {
    let t = 0
    const waits: number[] = []
    const traffic = createBlizzardTraffic({
      maxRps: 40,
      concurrency: 1,
      sleep: async (ms) => { waits.push(ms); t += ms },
      now: () => t,
    })
    await traffic.run(async () => {})
    await traffic.run(async () => {})
    const baseline = waits.at(-1) ?? 0
    assert.ok(baseline >= 20 && baseline <= 30, `target gap should be 25ms, got ${baseline}`)
    traffic.noteThrottle()
    waits.length = 0
    await traffic.run(async () => {})
    const throttled = waits.at(-1) ?? 0
    assert.ok(throttled >= 40 && throttled <= 60, `throttled gap should be ~50ms, got ${throttled}`)
    for (let i = 0; i < 10; i++) traffic.noteSuccess()
    waits.length = 0
    await traffic.run(async () => {})
    const stillThrottled = waits.at(-1) ?? 0
    assert.ok(stillThrottled >= 40 && stillThrottled <= 60, `10 clean calls must not recover, got ${stillThrottled}`)
    for (let i = 0; i < 80; i++) traffic.noteSuccess()
    await traffic.run(async () => {}) // drain any leftover wide slot
    waits.length = 0
    await traffic.run(async () => {})
    const recovered = waits.at(-1) ?? 0
    assert.ok(recovered >= 20 && recovered <= 30, `rate should climb back toward 25ms, got ${recovered}`)
  })
})

describe('traffic throttle waves', () => {
  it('halves rps only once for a parallel 429 wave at the same instant', async () => {
    let t = 0
    const waits: number[] = []
    const traffic = createBlizzardTraffic({
      maxRps: 40,
      concurrency: 1,
      sleep: async (ms) => { waits.push(ms); t += ms },
      now: () => t,
    })
    await traffic.run(async () => {})
    traffic.noteThrottle()
    traffic.noteThrottle()
    traffic.noteThrottle()
    traffic.noteThrottle()
    waits.length = 0
    await traffic.run(async () => {})
    const once = waits.at(-1) ?? 0
    assert.ok(once >= 40 && once <= 60, `one wave should halve once to ~50ms, got ${once}`)
  })

  it('does not open the gap past the 8 rps floor', async () => {
    let t = 0
    const waits: number[] = []
    const traffic = createBlizzardTraffic({
      maxRps: 40,
      concurrency: 1,
      sleep: async (ms) => { waits.push(ms); t += ms },
      now: () => t,
    })
    await traffic.run(async () => {})
    for (let i = 0; i < 6; i++) {
      if (i > 0) t += 1_000
      traffic.noteThrottle()
    }
    waits.length = 0
    await traffic.run(async () => {})
    const capped = waits.at(-1) ?? 0
    assert.ok(capped <= 125, `floor is 8 rps (125ms), got ${capped}`)
    assert.ok(capped >= 100, `expected to be at the floor, got ${capped}`)
  })

  it('caps Retry-After waits at 30 seconds', async () => {
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
          headers: { get: (name: string) => name.toLowerCase() === 'retry-after' ? '120' : null },
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
    assert.ok(waits.every(ms => ms <= 30_000), `Retry-After must cap at 30s, got ${waits.join(',')}`)
    assert.ok(waits.some(ms => ms === 30_000), `expected a 30s cap wait, got ${waits.join(',')}`)
  })
})

