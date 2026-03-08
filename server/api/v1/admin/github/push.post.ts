/**
 * POST /api/v1/admin/github/push
 *
 * Triggers a GitHub Actions workflow via repository dispatch.
 * This tells the addon repo to pull new data from the web API.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) || {}
  const reason = body.reason || 'manual-push'
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
    // Log failure
    db.insert(syncHistory).values({
      triggerSource: reason,
      status: 'error',
      details: err?.message || 'Unknown error',
    }).run()

    throw createError({
      statusCode: 502,
      message: `GitHub API error: ${err?.message || 'Unknown'}`,
    })
  }
})
