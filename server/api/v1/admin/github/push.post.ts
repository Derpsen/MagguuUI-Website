/**
 * POST /api/v1/admin/github/push
 *
 * Triggers a GitHub Actions workflow via repository dispatch.
 * This tells the addon repo to pull new data from the web API.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import { validateBody, githubPushSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
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

    return {
      success: true,
      data: { message: 'GitHub Sync triggered', repo: `${owner}/${repo}` },
    }
  } catch (err: any) {
    const statusCode = err?.response?.status || err?.statusCode || err?.status
    const githubMessage = err?.data?.message || err?.response?._data?.message || err?.message || 'Unknown error'

    // Map common GitHub API errors to actionable hints.
    let friendly = githubMessage
    if (statusCode === 401) {
      friendly = 'Token invalid or expired. Regenerate NUXT_GITHUB_TOKEN and restart the container.'
    } else if (statusCode === 403) {
      friendly = `Token lacks permission for ${owner}/${repo}. Classic PAT: enable "repo" scope. Fine-Grained PAT: grant "Contents: write" on ${owner}/${repo}.`
    } else if (statusCode === 404) {
      friendly = `Repo ${owner}/${repo} not found or token has no access to it. For Fine-Grained PATs, make sure the repo is explicitly selected.`
    }

    // Log failure with the friendly hint so sync history is useful.
    db.insert(syncHistory).values({
      triggerSource: reason,
      status: 'error',
      details: friendly,
    }).run()

    throw createError({
      statusCode: statusCode === 401 || statusCode === 403 ? statusCode : 502,
      message: friendly,
    })
  }
})
