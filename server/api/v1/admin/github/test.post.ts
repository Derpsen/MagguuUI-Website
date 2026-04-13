/**
 * POST /api/v1/admin/github/test
 *
 * Tests the GitHub connection by fetching repo info.
 * Verifies token has correct access to the configured repo.
 */

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  if (!config.githubToken) {
    apiError('MISSING_TOKEN', 'NUXT_GITHUB_TOKEN is not set', 400)
  }
  if (!config.githubRepo) {
    apiError('MISSING_REPO', 'NUXT_GITHUB_REPO is not set', 400)
  }

  const [owner, repo] = config.githubRepo.split('/')

  try {
    // Test 1: Can we access the repo?
    const repoInfo = await $fetch<{
      full_name: string
      private: boolean
      permissions?: { admin: boolean; push: boolean; pull: boolean }
    }>(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.githubToken}`,
        'User-Agent': 'MagguuUI-WebAdmin',
      },
      timeout: 10000,
    })

    // Test 2: Check rate limit
    const rateLimit = await $fetch<{
      rate: { limit: number; remaining: number; reset: number }
    }>('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
        'User-Agent': 'MagguuUI-WebAdmin',
      },
    })

    return apiSuccess({
      repo: repoInfo.full_name,
      isPrivate: repoInfo.private,
      permissions: repoInfo.permissions || null,
      rateLimit: {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        resetsAt: new Date(rateLimit.rate.reset * 1000).toISOString(),
      },
      webhookUrl: `/api/v1/webhooks/github`,
      webhookSecretConfigured: !!config.githubWebhookSecret,
    })
  } catch (err: any) {
    const status = err?.response?.status || err?.statusCode
    let errorMsg = err?.message || 'Unknown error'

    if (status === 401) errorMsg = 'Token invalid or expired'
    else if (status === 403) errorMsg = 'Access denied — token does not have sufficient permissions'
    else if (status === 404) errorMsg = `Repo "${owner}/${repo}" not found or no access`

    apiError('GITHUB_ERROR', errorMsg, status || 500)
  }
})
