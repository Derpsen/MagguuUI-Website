/**
 * POST /api/v1/admin/github/pull
 *
 * Imports one coherent snapshot of MagguuUI_Data from the configured addon
 * repository. The branch head is resolved once; every Lua file is fetched at
 * that immutable commit so a concurrent push cannot produce a mixed DB state.
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { settings, syncHistory } from '~/server/database/schema'
import {
  ADDON_DATA_ROOT,
  MAX_ADDON_LUA_SOURCE_BYTES,
  assertCompleteAddonLuaSnapshot,
  parseSafeAddonLuaPath,
} from '~/server/utils/addonProfileLua'
import {
  syncAddonProfileFile,
  syncWowUpFile,
  validateAddonProfileFile,
} from '~/server/utils/addonProfileSync'
import {
  CLASS_DATA_ROOT,
  CLASS_FILE_TO_NAME,
  MAX_CLASS_LUA_SOURCE_BYTES,
  syncClassLayoutFile,
  validateClassLayoutFile,
} from '~/server/utils/classLayoutSync'
import { createSyncChangelog } from '~/server/utils/syncChangelog'
import { syncAddonChangelog, type AddonChangelogSyncStats } from '~/server/utils/syncAddonChangelog'
import {
  fetchGitHubTextFile,
  getGitHubBranchHeadSha,
  listGitHubDirectoryFiles,
  parseGitHubRepo,
} from '~/server/utils/github'

const MAIN_BRANCH = 'main'
const MAX_CHANGELOG_BYTES = 4 * 1024 * 1024

interface SyncResult {
  file: string
  addon: string
  status: string
}

function upsertSetting(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get()
  if (existing) {
    db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.id, existing.id)).run()
  } else {
    db.insert(settings).values({ key, value }).run()
  }
}

function appendAddonResults(results: SyncResult[], file: string, sync: ReturnType<typeof syncAddonProfileFile>) {
  for (const change of sync.changes) {
    results.push({
      file,
      addon: `${change.addon}/${change.profile}`,
      status: change.status,
    })
  }
}

function appendWowUpResults(results: SyncResult[], file: string, sync: ReturnType<typeof syncWowUpFile>) {
  for (const change of sync.changes) {
    results.push({ file, addon: `WowUp/${change.name}`, status: change.status })
  }
}

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
  const results: SyncResult[] = []
  let addonChangelog: AddonChangelogSyncStats | null = null

  try {
    const snapshotSha = await getGitHubBranchHeadSha({ owner, repo, branch: MAIN_BRANCH, token })
    const addonFiles = await listGitHubDirectoryFiles({
      owner,
      repo,
      path: ADDON_DATA_ROOT,
      ref: snapshotSha,
      token,
    })
    const luaFiles = addonFiles.filter(file => file.name.endsWith('.lua')).sort((a, b) => a.path.localeCompare(b.path))
    assertCompleteAddonLuaSnapshot(luaFiles.map(file => file.name))
    const addonSources: Array<{ path: string, content: string, isWowUp: boolean }> = []
    for (const file of luaFiles) {
      const descriptor = parseSafeAddonLuaPath(file.path)
      if (file.size > MAX_ADDON_LUA_SOURCE_BYTES) {
        throw new Error(`${file.path} exceeds the ${MAX_ADDON_LUA_SOURCE_BYTES}-byte safety limit`)
      }
      const content = await fetchGitHubTextFile({
        owner,
        repo,
        path: file.path,
        ref: snapshotSha,
        token,
        maxBytes: MAX_ADDON_LUA_SOURCE_BYTES,
      })
      validateAddonProfileFile(file.path, content)
      addonSources.push({ path: file.path, content, isWowUp: descriptor.isWowUp })
    }

    const classSources: Array<{ path: string, content: string, className: string }> = []
    for (const [fileName, className] of Object.entries(CLASS_FILE_TO_NAME)) {
      const classPath = `${CLASS_DATA_ROOT}/${fileName}`
      const content = await fetchGitHubTextFile({
        owner,
        repo,
        path: classPath,
        ref: snapshotSha,
        token,
        maxBytes: MAX_CLASS_LUA_SOURCE_BYTES,
      })
      validateClassLayoutFile(classPath, content)
      classSources.push({ path: classPath, content, className })
    }

    // Every remote read and parser completed before the first mutation. The
    // outer transaction also rolls back earlier files if a DB write fails.
    sqlite.transaction(() => {
      for (const source of addonSources) {
        if (source.isWowUp) {
          appendWowUpResults(results, source.path, syncWowUpFile(source.path, source.content))
        } else {
          appendAddonResults(results, source.path, syncAddonProfileFile(source.path, source.content))
        }
      }
      for (const source of classSources) {
        const sync = syncClassLayoutFile(source.path, source.content)
        const status = sync.changes.some(change => change.status === 'created')
          ? 'created'
          : sync.changes.some(change => change.status === 'updated') ? 'updated' : 'unchanged'
        results.push({ file: source.path, addon: `${source.className} (${sync.changes.length} specs)`, status })
      }
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
