import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  GitHubRateLimitError,
  githubRateLimitSkipReason,
  isGithubRateLimitResponse,
  parseRateLimitHeaders,
  rateLimitErrorFrom,
  rememberGithubRateLimit,
  resetGithubRateLimitState,
  shouldSkipGithubCall,
} from '../../server/utils/githubRateLimit'
import {
  GITHUB_SYNC_LOCK_TTL_MS,
  isGithubSyncLockHeld,
  releaseGithubSyncLock,
  resetGithubSyncLock,
  tryAcquireGithubSyncLock,
  withGithubSyncLock,
} from '../../server/utils/githubSyncLock'
import { sanitizeGithubRunReason, scheduledRunFromSettings } from '../../server/utils/githubScheduledSync'

describe('github sync lock', () => {
  beforeEach(() => resetGithubSyncLock())

  it('lets one caller in and blocks the second until release', async () => {
    assert.equal(tryAcquireGithubSyncLock(1000), true)
    assert.equal(isGithubSyncLockHeld(1000), true)
    assert.equal(tryAcquireGithubSyncLock(1000), false)
    releaseGithubSyncLock()
    assert.equal(tryAcquireGithubSyncLock(1000), true)
    const again = await withGithubSyncLock(async () => 'nope', 1000)
    assert.deepEqual(again, { ok: false, reason: 'locked' })
    resetGithubSyncLock()
    const ok = await withGithubSyncLock(async () => 7, 1000)
    assert.deepEqual(ok, { ok: true, value: 7 })
    assert.equal(isGithubSyncLockHeld(1000), false)
  })

  it('expires a stuck hold after the TTL', () => {
    assert.equal(tryAcquireGithubSyncLock(1000), true)
    assert.equal(tryAcquireGithubSyncLock(1000 + GITHUB_SYNC_LOCK_TTL_MS - 1), false)
    assert.equal(tryAcquireGithubSyncLock(1000 + GITHUB_SYNC_LOCK_TTL_MS), true)
  })
})

describe('github rate limit', () => {
  beforeEach(() => resetGithubRateLimitState())

  it('reads remaining and reset from GitHub headers', () => {
    const parsed = parseRateLimitHeaders({
      get: (name: string) => ({ 'x-ratelimit-remaining': '2', 'x-ratelimit-reset': '1700000000', 'x-ratelimit-limit': '5000' })[name] || null,
    })
    assert.deepEqual(parsed, { remaining: 2, resetAt: 1_700_000_000, limit: 5000 })
  })

  it('treats 429 and remaining-0 403 as rate limits, not a normal permission 403', () => {
    assert.equal(isGithubRateLimitResponse(429, 'anything'), true)
    assert.equal(isGithubRateLimitResponse(403, 'API rate limit exceeded'), true)
    assert.equal(isGithubRateLimitResponse(403, 'nope', { get: (n: string) => (n === 'x-ratelimit-remaining' ? '0' : n === 'x-ratelimit-reset' ? '9' : null) }), true)
    assert.equal(isGithubRateLimitResponse(403, 'Token lacks permission for owner/repo'), false)
    assert.equal(isGithubRateLimitResponse(401, 'bad creds'), false)
  })

  it('skips further calls until reset, then allows them again', () => {
    const now = 1_700_000_000_000
    rememberGithubRateLimit({
      get: (n: string) => (n === 'x-ratelimit-remaining' ? '0' : n === 'x-ratelimit-reset' ? String(Math.floor(now / 1000) + 30) : null),
    }, now)
    assert.equal(shouldSkipGithubCall(now), true)
    assert.match(githubRateLimitSkipReason(now), /retry after/i)
    assert.equal(shouldSkipGithubCall(now + 31_000), false)
  })

  it('builds a soft rate-limit error from 429 + Retry-After', () => {
    const now = 1_700_000_000_000
    const err = rateLimitErrorFrom(429, 'Wait', {
      get: (n: string) => (n === 'retry-after' ? '12' : n === 'x-ratelimit-remaining' ? '0' : null),
    }, now)
    assert.ok(err instanceof GitHubRateLimitError)
    assert.equal(err.status, 429)
    assert.equal(shouldSkipGithubCall(now), true)
  })
})

describe('scheduled run status', () => {
  it('redacts tokens and caps the reason', () => {
    const reason = sanitizeGithubRunReason('Bearer ghp_SECRETTOKEN123 failed Authorization: abc and github_pat_ABC also')
    assert.equal(reason.includes('ghp_'), false)
    assert.equal(reason.includes('SECRETTOKEN'), false)
    assert.equal(reason.includes('github_pat_'), false)
    assert.match(reason, /\[redacted\]/)
    assert.ok(sanitizeGithubRunReason('x'.repeat(500)).length <= 200)
  })

  it('reads only ok/error/skipped runs with a timestamp', () => {
    assert.equal(scheduledRunFromSettings({}), null)
    assert.equal(scheduledRunFromSettings({ at: '2026-11-12T02:30:00.000Z', status: 'weird' }), null)
    assert.deepEqual(
      scheduledRunFromSettings({ at: '2026-11-12T02:30:00.000Z', status: 'ok', reason: 'Release 12.1.9' }),
      { at: '2026-11-12T02:30:00.000Z', status: 'ok', reason: 'Release 12.1.9' },
    )
    assert.equal(scheduledRunFromSettings({ at: '2026-11-12T02:30:00.000Z', status: 'skipped', reason: 'Already running' })?.status, 'skipped')
  })
})
