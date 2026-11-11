/**
 * Shared GitHub release-check and TOC catalogue sync used by the admin
 * buttons and the nightly scheduled task. Callers own the sync lock.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import { recordLatestRelease } from '~/server/utils/addonVersion'
import { syncAddonsFromToc, type SyncAddonsResult } from '~/server/utils/syncAddons'
import {
  fetchGitHubTextFile,
  getGitHubBranchHeadSha,
  githubErrorHint,
  githubFetch,
  parseGitHubError,
  parseGitHubRepo,
} from '~/server/utils/github'
import { isGitHubRateLimitError } from '~/server/utils/githubRateLimit'
import { logActivity } from '~/server/utils/activityLog'

const MAIN_BRANCH = 'main'
const MAX_TOC_BYTES = 256 * 1024

export function githubRepoCredentials(): { owner: string, repo: string, token: string } | { error: string } {
  const config = useRuntimeConfig()
  const token = typeof config.githubToken === 'string' ? config.githubToken : ''
  const repoRef = parseGitHubRepo(typeof config.githubRepo === 'string' && config.githubRepo ? config.githubRepo : 'Derpsen/MagguuUI')
  if (!token) return { error: 'GitHub token is not configured' }
  if (!repoRef) return { error: 'GitHub repository is not configured' }
  return { owner: repoRef.owner, repo: repoRef.repo, token }
}

export interface LatestReleaseCheck {
  latestVersion: string
  localVersion: string | null
  isUpToDate: boolean
  releaseName: string
  publishedAt: string
}

export async function checkLatestRelease(): Promise<LatestReleaseCheck> {
  const creds = githubRepoCredentials()
  if ('error' in creds) throw createError({ statusCode: 400, message: creds.error })
  const { owner, repo, token } = creds
  const response = await githubFetch<{ tag_name: string, name: string, published_at: string }>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`,
    { token, timeout: 10_000 },
  )
  const applied = recordLatestRelease(response.tag_name)
  if (!applied) throw createError({ statusCode: 502, message: 'Latest release has no tag name' })
  return {
    latestVersion: applied.latestVersion,
    localVersion: applied.localVersion,
    isUpToDate: applied.localVersion === applied.latestVersion,
    releaseName: response.name,
    publishedAt: response.published_at,
  }
}

export async function resyncAddonsFromToc(triggerSource: string): Promise<SyncAddonsResult> {
  const creds = githubRepoCredentials()
  if ('error' in creds) throw createError({ statusCode: 400, message: creds.error })
  const { owner, repo, token } = creds
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
      triggerSource,
      status: 'success',
      details: `Inserted ${result.inserted}, updated ${result.updated}, removed ${result.unavailable} (toc deps: ${result.total})`,
    }).run()
    logActivity({
      action: 'updated',
      entityType: 'addon',
      entityName: `Resynced ${result.total} addons from .toc`,
      details: `inserted=${result.inserted}, updated=${result.updated}, removed=${result.unavailable}`,
    })
    return result
  } catch (err: unknown) {
    if (isGitHubRateLimitError(err)) {
      db.insert(syncHistory).values({
        triggerSource,
        status: 'error',
        details: err.message,
      }).run()
      throw err
    }
    const { status, message } = parseGitHubError(err)
    const friendly = githubErrorHint(owner, repo, status, message)
    db.insert(syncHistory).values({
      triggerSource,
      status: 'error',
      details: friendly,
    }).run()
    throw createError({ statusCode: 502, message: friendly })
  }
}

export function githubSyncFailureHint(err: unknown, fallback: string): { status: number, message: string, soft: boolean } {
  if (isGitHubRateLimitError(err)) {
    return { status: err.status || 429, message: err.message, soft: true }
  }
  const creds = githubRepoCredentials()
  const owner = 'error' in creds ? 'repo' : creds.owner
  const repo = 'error' in creds ? 'unknown' : creds.repo
  const parsed = parseGitHubError(err)
  const status = parsed.status ?? 502
  const soft = status === 403 || status === 429
  const message = parsed.status === 404
    ? `No published release for ${owner}/${repo}, or the token cannot read releases.`
    : githubErrorHint(owner, repo, parsed.status, fallback)
  return { status, message, soft }
}
