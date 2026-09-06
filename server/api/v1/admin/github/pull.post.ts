/**
 * POST /api/v1/admin/github/pull
 *
 * Imports one coherent snapshot of Data/ from the configured addon
 * repository. The branch head is resolved once; every Lua file is fetched at
 * that immutable commit so a concurrent push cannot produce a mixed DB state.
 */

import { db, sqlite } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import {
  applyAddonLuaSnapshot,
  applyClassLuaSnapshot,
  fetchAddonLuaSnapshot,
  fetchClassLuaSnapshot,
  type GithubDataSyncResult,
} from '~/server/utils/githubDataSnapshot'
import { createSyncChangelog } from '~/server/utils/syncChangelog'
import { syncAddonChangelog, type AddonChangelogSyncStats } from '~/server/utils/syncAddonChangelog'
import {
  fetchGitHubTextFile,
  getGitHubBranchHeadSha,
  parseGitHubRepo,
} from '~/server/utils/github'
import { upsertSetting } from '~/server/utils/settings'

const MAIN_BRANCH = 'main'
const MAX_CHANGELOG_BYTES = 4 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const { allowed, retryAfter } = checkRateLimit(`admin-gh-pull:${ip}`, 5, 10 * 60 * 1000, 10 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, message: `Too many GitHub pull requests. Wait ${Math.ceil(retryAfter / 60)} minutes.` })
  }

  const config = useRuntimeConfig()
  const token = config.githubToken || ''
  const repoRef = parseGitHubRepo(config.githubRepo || '')
  if (!token || !repoRef) {
    throw createError({ statusCode: 400, message: 'GitHub Token or Repo not configured.' })
  }

  const { owner, repo } = repoRef
  const results: GithubDataSyncResult[] = []
  let addonChangelog: AddonChangelogSyncStats | null = null

  try {
    const snapshotSha = await getGitHubBranchHeadSha({ owner, repo, branch: MAIN_BRANCH, token })
    const fetchOpts = { owner, repo, ref: snapshotSha, token }
    const addonSources = await fetchAddonLuaSnapshot(fetchOpts)
    const classSources = await fetchClassLuaSnapshot(fetchOpts)

    // Every remote read and parser completed before the first mutation. The
    // outer transaction also rolls back earlier files if a DB write fails.
    sqlite.transaction(() => {
      applyAddonLuaSnapshot(addonSources, results)
      applyClassLuaSnapshot(classSources, results)
    })()

    try {
      const release = await $fetch<{ tag_name: string }>(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'MagguuUI-WebAdmin',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          timeout: 10000,
        },
      )
      const version = (release.tag_name || '').replace(/^v/, '')
      upsertSetting('github_latest_version', version)
      upsertSetting('github_last_check', new Date().toISOString())

      if (/^[0-9A-Za-z._-]+$/.test(release.tag_name)) {
        const markdown = await fetchGitHubTextFile({
          owner,
          repo,
          path: 'CHANGELOG.md',
          ref: release.tag_name,
          token,
          maxBytes: MAX_CHANGELOG_BYTES,
        })
        addonChangelog = syncAddonChangelog(markdown)
      }
    } catch {
      // Release metadata is independent from profile data and remains optional.
    }

    const created = results.filter(result => result.status === 'created').length
    const updated = results.filter(result => result.status === 'updated').length
    const unchanged = results.filter(result => result.status === 'unchanged').length
    createSyncChangelog(results, 'pull')

    db.insert(syncHistory).values({
      triggerSource: 'manual-pull',
      status: 'success',
      details: `Pull ${snapshotSha.slice(0, 12)}: ${created} created, ${updated} updated, ${unchanged} unchanged, 0 errors`,
    }).run()

    return apiSuccess({
      message: `Pull complete: ${created} created, ${updated} updated, ${unchanged} unchanged`,
      snapshotSha,
      results,
      summary: { created, updated, unchanged, errors: 0 },
      changelog: addonChangelog,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    db.insert(syncHistory).values({
      triggerSource: 'manual-pull',
      status: 'error',
      details: message,
    }).run()
    throw createError({ statusCode: 502, message: `GitHub API error: ${message}` })
  }
})