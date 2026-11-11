/**
 * POST /api/v1/admin/addons/resync
 *
 * Manually re-pull MagguuUI.toc from GitHub and run the addon sync.
 * Useful when the webhook missed an event (e.g. server downtime) or the admin
 * wants to verify the auto-sync without pushing a commit.
 *
 * MagguuUI is private. Read the toc through the contents API, same as the
 * webhook, so a rejected token comes back as 401 instead of a raw 404.
 */

import { resyncAddonsFromToc } from '~/server/utils/githubAddonSync'
import { isGitHubRateLimitError } from '~/server/utils/githubRateLimit'
import { withGithubSyncLock } from '~/server/utils/githubSyncLock'

export default defineEventHandler(async (event) => {
  requireAdminAccess(event)

  try {
    const locked = await withGithubSyncLock(() => resyncAddonsFromToc('admin-toc-resync'))
    if (!locked.ok) {
      throw createError({ statusCode: 409, message: 'A GitHub check or catalogue sync is already running.' })
    }
    return apiSuccess(locked.value)
  } catch (err: unknown) {
    if (isErrorWithStatus(err)) throw err
    if (isGitHubRateLimitError(err)) {
      throw createError({ statusCode: 429, message: err.message })
    }
    throw err
  }
})

function isErrorWithStatus(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'statusCode' in err)
}
