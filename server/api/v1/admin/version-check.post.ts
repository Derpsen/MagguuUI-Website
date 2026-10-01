/**
 * POST /api/v1/admin/version-check
 *
 * Fetches the latest release tag from GitHub and stores it in settings.
 * Compares with local addon_version setting.
 */

import { upsertSetting } from '~/server/utils/settings'
import { resolveLocalAddonVersion } from '~/server/utils/addonVersion'
import { githubErrorHint, parseGitHubError, parseGitHubRepo } from '~/server/utils/github'

export default defineEventHandler(async (event) => {
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

  const config = useRuntimeConfig()
  const token = typeof config.githubToken === 'string' ? config.githubToken : ''
  const repoRef = parseGitHubRepo(typeof config.githubRepo === 'string' ? config.githubRepo : '')
  if (!token) {
    throw apiError('MISSING_TOKEN', 'NUXT_GITHUB_TOKEN is not set', 400)
  }
  if (!repoRef) {
    throw apiError('MISSING_REPO', 'NUXT_GITHUB_REPO is not set', 400)
  }

  const { owner, repo } = repoRef

  try {
    // MagguuUI is private. releases/latest 404s without the same token the pull uses.
    const response = await $fetch<{ tag_name: string; name: string; published_at: string }>(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MagguuUI-WebAdmin',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        timeout: 10000,
      }
    )

    const latestVersion = (response.tag_name || '').replace(/^v/, '')

    upsertSetting('github_latest_version', latestVersion)
    upsertSetting('github_last_check', new Date().toISOString())

    const localVersion = resolveLocalAddonVersion({ persistMissing: true })

    return apiSuccess({
      latestVersion,
      localVersion,
      isUpToDate: localVersion === latestVersion,
      releaseName: response.name,
      publishedAt: response.published_at,
    })
  } catch (e: unknown) {
    const parsed = parseGitHubError(e)
    const message = parsed.status === 404
      ? `No published release for ${owner}/${repo}, or the token cannot read releases.`
      : githubErrorHint(owner, repo, parsed.status, 'GitHub release check failed')
    throw apiError('GITHUB_ERROR', message, 502)
  }
})