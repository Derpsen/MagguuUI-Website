import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  LOGIN_ACCOUNT_BACKOFF,
  LOGIN_IP_BACKOFF,
  backoffDelayMs,
  nextFailureState,
  retryAfterSeconds,
  type BackoffState,
} from '../../server/utils/loginBackoff'

const cfg = { freeFailures: 3, baseMs: 1000, maxMs: 8000, resetAfterMs: 60_000 }

test('free failures cost nothing, then the delay doubles up to the cap', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map(n => backoffDelayMs(n, cfg)), [0, 0, 0, 1000, 2000, 4000, 8000, 8000])
})

test('state machine blocks after free failures and resets after a quiet period', () => {
  let s: BackoffState | undefined
  let now = 0
  for (let i = 0; i < 3; i++) s = nextFailureState(s, (now += 10), cfg)
  assert.equal(retryAfterSeconds(s, now), 0)
  s = nextFailureState(s, (now += 10), cfg)
  assert.equal(s.failures, 4)
  assert.equal(retryAfterSeconds(s, now), 1)
  s = nextFailureState(s, (now += 10), cfg)
  assert.equal(retryAfterSeconds(s, now), 2)
  // Quiet period → count starts over
  s = nextFailureState(s, now + 60_001, cfg)
  assert.equal(s.failures, 1)
  assert.equal(s.blockedUntil, 0)
})

test('production defaults: per-IP and per-account are throttles, capped at 15 min', () => {
  assert.equal(backoffDelayMs(LOGIN_IP_BACKOFF.freeFailures, LOGIN_IP_BACKOFF), 0)
  assert.equal(backoffDelayMs(LOGIN_IP_BACKOFF.freeFailures + 1, LOGIN_IP_BACKOFF), 30_000)
  assert.equal(backoffDelayMs(1000, LOGIN_ACCOUNT_BACKOFF), 15 * 60_000)
})
