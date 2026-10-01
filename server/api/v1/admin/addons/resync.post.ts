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

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import {
  fetchGitHubTextFile,
  getGitHubBranchHeadSha,
  githubErrorHint,
  parseGitHubError,
  parseGitHubRepo,
} from '~/server/utils/github'
import { syncAddonsFromToc } from '~/server/utils/syncAddons'

const MAIN_BRANCH = 'main'
const MAX_TOC_BYTES = 256 * 1024

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const token = (config.githubToken as string | undefined) || ''
  const repoRef = parseGitHubRepo(config.githubRepo || 'Derpsen/MagguuUI')
  if (!repoRef) {
    throw createError({ statusCode: 500, message: 'GitHub repo not configured' })
  }
  if (!token) {
    throw createError({ statusCode: 400, message: 'GitHub token not configured' })
  }

  const { owner, repo } = repoRef

  try {
    const snapshotSha = await getGitHubBranchHeadSha({ owner, repo, branch: MAIN_BRANCH, token })
    const tocContent = await fetchGitHubTextFile({
      owner,
      repo,
      path: 'MagguuUI.toc',
      ref: snapshotSha,
      token,
      maxBytes: MAX_TOC_BYTES,
    })
    const result = syncAddonsFromToc(tocContent)

    db.insert(syncHistory).values({
      triggerSource: 'admin-toc-resync',
      status: 'success',
      details: `Inserted ${result.inserted}, updated ${result.updated}, removed ${result.unavailable} (toc deps: ${result.total})`,
    }).run()

    logActivity({
      action: 'updated',
      entityType: 'addon',
      entityName: `Resynced ${result.total} addons from .toc`,
      details: `inserted=${result.inserted}, updated=${result.updated}, removed=${result.unavailable}`,
    })
    return apiSuccess(result)
  } catch (err: unknown) {
    const { status, message } = parseGitHubError(err)
    const friendly = githubErrorHint(owner, repo, status, message)
    db.insert(syncHistory).values({
      triggerSource: 'admin-toc-resync',
      status: 'error',
      details: friendly,
    }).run()
    throw createError({ statusCode: 502, message: friendly })
  }
})
