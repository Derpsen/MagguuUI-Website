/**
 * POST /api/v1/admin/version-check
 *
 * Fetches the latest release tag from GitHub and stores it in settings.
 * The newest tag also becomes the local version (recordLatestRelease), so the
 * "Addon version outdated" bell clears after a check.
 */

import { checkLatestRelease, githubSyncFailureHint } from '~/server/utils/githubAddonSync'
import { isGitHubRateLimitError } from '~/server/utils/githubRateLimit'
import { withGithubSyncLock } from '~/server/utils/githubSyncLock'

export default defineEventHandler(async (event) => {
  requireAdminAccess(event)
  // Even though the middleware authenticates this endpoint, an admin token
  // could be replayed at high frequency to fan-out outbound requests against
  // api.github.com. 10 calls / 10 min is enough for legitimate UI use.
  const ip = getClientIp(event)
  const { allowed, retryAfter } = checkRateLimit(
    `version-check:${rateLimitIpKey(ip)}`,
    10,
    10 * 60 * 1000,
    10 * 60 * 1000,
  )
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw apiError('RATE_LIMITED', 'Too many version checks. Please wait a moment.', 429)
  }

  try {
    const locked = await withGithubSyncLock(() => checkLatestRelease())
    if (!locked.ok) {
      throw apiError('SYNC_IN_PROGRESS', 'A GitHub check or catalogue sync is already running.', 409)
    }
    return apiSuccess(locked.value)
  } catch (e: unknown) {
    if (isErrorWithStatus(e)) throw e
    if (isGitHubRateLimitError(e)) {
      throw apiError('GITHUB_RATE_LIMIT', e.message, 429)
    }
    const hint = githubSyncFailureHint(e, 'GitHub release check failed')
    throw apiError('GITHUB_ERROR', hint.message, hint.soft ? 429 : 502)
  }
})

function isErrorWithStatus(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'statusCode' in err)
}
