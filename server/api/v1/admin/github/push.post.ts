/**
 * POST /api/v1/admin/github/push
 *
 * Triggers a GitHub Actions workflow via repository dispatch.
 * This tells the addon repo to pull new data from the web API.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import { validateBody, githubPushSchema } from '~/server/utils/validation'
import { parseGitHubError, githubErrorHint } from '~/server/utils/github'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const { allowed, retryAfter } = checkRateLimit(`admin-gh-push:${ip}`, 10, 10 * 60 * 1000, 10 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({ statusCode: 429, message: `Too many GitHub sync requests. Wait ${Math.ceil(retryAfter / 60)} minutes.` })
  }

  const body = await readBody(event) || {}
  const data = validateBody(githubPushSchema, body)
  const reason = data.reason || 'manual-push'
  const config = useRuntimeConfig()

  if (!config.githubToken || !config.githubRepo) {
    throw createError({
      statusCode: 400,
      message: 'GitHub Token or Repo not configured. Set NUXT_GITHUB_TOKEN and NUXT_GITHUB_REPO.',
    })
  }

  const [owner, repo] = config.githubRepo.split('/')

  try {
    await $fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${config.githubToken}`,
      },
      body: {
        event_type: 'profile-sync',
        client_payload: {
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Log success
    db.insert(syncHistory).values({
      triggerSource: reason,
      status: 'success',
      details: `Push to ${owner}/${repo} triggered`,
    }).run()

    return apiSuccess({ message: 'GitHub Sync triggered', repo: `${owner}/${repo}` })
  } catch (err: unknown) {
    const { status, message } = parseGitHubError(err)
    const friendly = githubErrorHint(owner, repo, status, message)

    // Log failure with the friendly hint so sync history is useful.
    db.insert(syncHistory).values({
      triggerSource: reason,
      status: 'error',
      details: friendly,
    }).run()

    throw createError({
      statusCode: status === 401 || status === 403 ? status : 502,
      message: friendly,
    })
  }
})
