/**
 * Shared GitHub Data/ snapshot import for manual pull and signed webhooks.
 *
 * Fetch+validate stays separate from DB apply so pull can wrap addon+class
 * in one transaction while the webhook keeps soft per-snapshot error rows.
 */

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
  parseSafeClassLuaPath,
  syncClassLayoutFile,
  validateClassLayoutFile,
} from '~/server/utils/classLayoutSync'
import { fetchGitHubTextFile, listGitHubDirectoryFiles } from '~/server/utils/github'

export type GithubDataSyncStatus = 'created' | 'updated' | 'unchanged'

export interface GithubDataSyncResult {
  file: string
  addon: string
  status: GithubDataSyncStatus
}

export interface AddonLuaSource {
  path: string
  content: string
  isWowUp: boolean
}

export interface ClassLuaSource {
  path: string
  content: string
  className: string
}

export interface GithubSnapshotFetchOptions {
  owner: string
  repo: string
  ref: string
  token?: string
  /** Directory listing cap; pull defaults to github.ts (256), webhook uses 128. */
  maxEntries?: number
}

function appendAddonResults(
  results: GithubDataSyncResult[],
  file: string,
  sync: ReturnType<typeof syncAddonProfileFile>,
) {
  for (const change of sync.changes) {
    results.push({
      file,
      addon: `${change.addon}/${change.profile}`,
      status: change.status,
    })
  }
}

function appendWowUpResults(
  results: GithubDataSyncResult[],
  file: string,
  sync: ReturnType<typeof syncWowUpFile>,
) {
  for (const change of sync.changes) {
    results.push({ file, addon: `WowUp/${change.name}`, status: change.status })
  }
}

/** List, size-check, fetch, and parse-validate every Data/*.lua at one SHA. */
export async function fetchAddonLuaSnapshot(
  options: GithubSnapshotFetchOptions,
): Promise<AddonLuaSource[]> {
  const files = await listGitHubDirectoryFiles({
    owner: options.owner,
    repo: options.repo,
    path: ADDON_DATA_ROOT,
    ref: options.ref,
    token: options.token,
    maxEntries: options.maxEntries,
  })
  const luaFiles = files
    .filter(file => file.name.endsWith('.lua'))
    .sort((a, b) => a.path.localeCompare(b.path))
  assertCompleteAddonLuaSnapshot(luaFiles.map(file => file.name))

  const sources: AddonLuaSource[] = []
  for (const file of luaFiles) {
    const descriptor = parseSafeAddonLuaPath(file.path)
    if (file.size > MAX_ADDON_LUA_SOURCE_BYTES) {
      throw new Error(`${file.path} exceeds the ${MAX_ADDON_LUA_SOURCE_BYTES}-byte safety limit`)
    }
    const content = await fetchGitHubTextFile({
      owner: options.owner,
      repo: options.repo,
      path: file.path,
      ref: options.ref,
      token: options.token,
      maxBytes: MAX_ADDON_LUA_SOURCE_BYTES,
    })
    validateAddonProfileFile(file.path, content)
    sources.push({ path: file.path, content, isWowUp: descriptor.isWowUp })
  }
  return sources
}

/** Fetch+validate every supported MagguuUI_Data/Classes/*.lua at one SHA. */
export async function fetchClassLuaSnapshot(
  options: GithubSnapshotFetchOptions,
): Promise<ClassLuaSource[]> {
  const sources: ClassLuaSource[] = []
  for (const [fileName, className] of Object.entries(CLASS_FILE_TO_NAME)) {
    const path = `${CLASS_DATA_ROOT}/${fileName}`
    parseSafeClassLuaPath(path)
    const content = await fetchGitHubTextFile({
      owner: options.owner,
      repo: options.repo,
      path,
      ref: options.ref,
      token: options.token,
      maxBytes: MAX_CLASS_LUA_SOURCE_BYTES,
    })
    validateClassLayoutFile(path, content)
    sources.push({ path, content, className })
  }
  return sources
}

/**
 * Apply previously fetched addon Lua sources. Caller owns the transaction
 * (pull wraps addon+class together; webhook wraps each snapshot alone).
 */
export function applyAddonLuaSnapshot(
  sources: AddonLuaSource[],
  results: GithubDataSyncResult[],
): void {
  for (const source of sources) {
    if (source.isWowUp) {
      appendWowUpResults(results, source.path, syncWowUpFile(source.path, source.content))
    }
    else {
      appendAddonResults(results, source.path, syncAddonProfileFile(source.path, source.content))
    }
  }
}

/**
 * Apply previously fetched class Lua sources. Caller owns the transaction.
 */
export function applyClassLuaSnapshot(
  sources: ClassLuaSource[],
  results: GithubDataSyncResult[],
): void {
  for (const source of sources) {
    const sync = syncClassLayoutFile(source.path, source.content)
    const status = sync.changes.some(change => change.status === 'created')
      ? 'created'
      : sync.changes.some(change => change.status === 'updated') ? 'updated' : 'unchanged'
    results.push({
      file: source.path,
      addon: `${source.className} (${sync.changes.length} specs)`,
      status,
    })
  }
}