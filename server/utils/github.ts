/**
 * GitHub Utilities
 *
 * Trigger GitHub Actions workflows via Repository Dispatch.
 * Uses debounce to batch rapid edits into a single sync.
 * Default: waits 10 seconds after the last change before triggering.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'

const GITHUB_API_VERSION = '2022-11-28'
const SAFE_GITHUB_PATH_SEGMENT_RE = /^[A-Za-z0-9_.!-]+$/
export const GITHUB_COMMIT_SHA_RE = /^[0-9a-f]{40}$/i

const DEBOUNCE_MS = 10_000 // 10 seconds
const MAX_SYNC_REASON_LENGTH = 160
const MAX_PENDING_REASONS = 50

/**
 * Shape of errors thrown by ofetch/nitro when a GitHub API call fails.
 * Only the bits we read are typed; unknown shapes fall back to string.
 */
interface GitHubFetchError {
  response?: { status?: number, _data?: { message?: string } }
  statusCode?: number
  status?: number
  data?: { message?: string }
  message?: string
}

export function parseGitHubError(err: unknown): { status: number | undefined, message: string } {
  const e = err as GitHubFetchError
  const status = e?.response?.status || e?.statusCode || e?.status
  const message = e?.data?.message || e?.response?._data?.message || e?.message || 'Unknown error'
  return { status, message }
}

export function githubErrorHint(owner: string, repo: string, status: number | undefined, fallback: string) {
  if (status === 401) return 'Token invalid or expired. Regenerate NUXT_GITHUB_TOKEN and restart the container.'
  if (status === 403) return `Token lacks permission for ${owner}/${repo}. Classic PAT: enable "repo" scope. Fine-Grained PAT: grant "Contents: write" on ${owner}/${repo}.`
  if (status === 404) return `Repo ${owner}/${repo} not found or token has no access to it. For Fine-Grained PATs, make sure the repo is explicitly selected.`
  return fallback
}

export function parseGitHubRepo(value: string): { owner: string; repo: string } | null {
  const [owner, repo, extra] = value.split('/')
  if (!owner || !repo || extra) return null
  return { owner, repo }
}

export function githubRepoMatches(configuredRepo: string, payloadRepo?: string | null) {
  return Boolean(payloadRepo && configuredRepo.toLowerCase() === payloadRepo.toLowerCase())
}

export function isGitHubCommitSha(value: string): boolean {
  return GITHUB_COMMIT_SHA_RE.test(value)
}

export async function fetchGitHubTextFile(options: {
  owner: string
  repo: string
  path: string
  ref: string
  token?: string
  maxBytes: number
}) {
  const encodedPath = encodeGitHubPath(options.path)
  const content = await $fetch<string>(
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${encodedPath}`,
    {
      query: { ref: options.ref },
      headers: githubHeaders(options.token, 'application/vnd.github.raw+json'),
      timeout: 15000,
    },
  )

  if (typeof content !== 'string') {
    throw new Error(`GitHub returned a non-text payload for ${options.path}`)
  }
  const size = new TextEncoder().encode(content).byteLength
  if (size > options.maxBytes) {
    throw new Error(`${options.path} exceeds the ${options.maxBytes}-byte safety limit`)
  }
  return content
}

export interface GitHubDirectoryFile {
  name: string
  path: string
  size: number
}

export async function listGitHubDirectoryFiles(options: {
  owner: string
  repo: string
  path: string
  ref: string
  token?: string
  maxEntries?: number
}): Promise<GitHubDirectoryFile[]> {
  const encodedPath = encodeGitHubPath(options.path)
  const maxEntries = options.maxEntries ?? 256
  const payload = await $fetch<unknown>(
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${encodedPath}`,
    {
      query: { ref: options.ref },
      headers: githubHeaders(options.token),
      timeout: 15000,
    },
  )

  if (!Array.isArray(payload)) {
    throw new Error(`GitHub returned a non-directory payload for ${options.path}`)
  }
  if (payload.length > maxEntries) {
    throw new Error(`${options.path} exceeds the ${maxEntries}-entry safety limit`)
  }

  const prefix = `${options.path}/`
  const files: GitHubDirectoryFile[] = []
  const seen = new Set<string>()
  for (const value of payload) {
    if (!value || typeof value !== 'object') {
      throw new Error(`GitHub returned an invalid directory entry for ${options.path}`)
    }
    const entry = value as { type?: unknown, name?: unknown, path?: unknown, size?: unknown }
    if (entry.type !== 'file') continue
    if (typeof entry.name !== 'string' || typeof entry.path !== 'string') {
      throw new Error(`GitHub returned an invalid file entry for ${options.path}`)
    }
    if (entry.path !== `${prefix}${entry.name}` || entry.name.includes('/')) {
      throw new Error(`GitHub returned an out-of-directory path for ${options.path}`)
    }
    encodeGitHubPath(entry.path)
    if (seen.has(entry.path)) throw new Error(`GitHub returned a duplicate path: ${entry.path}`)
    seen.add(entry.path)

    const size = typeof entry.size === 'number' && Number.isSafeInteger(entry.size) && entry.size >= 0
      ? entry.size
      : 0
    files.push({ name: entry.name, path: entry.path, size })
  }
  return files
}

export async function getGitHubBranchHeadSha(options: {
  owner: string
  repo: string
  branch: string
  token?: string
}) {
  if (!/^[A-Za-z0-9._/-]+$/.test(options.branch) || options.branch.includes('..')) {
    throw new Error('Unsafe GitHub branch name')
  }
  const ref = await $fetch<{ object?: { sha?: string } }>(
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/git/ref/heads/${options.branch.split('/').map(encodeURIComponent).join('/')}`,
    {
      headers: githubHeaders(options.token),
      timeout: 10000,
    },
  )
  const sha = ref.object?.sha || ''
  if (!isGitHubCommitSha(sha)) throw new Error('GitHub returned an invalid branch head SHA')
  return sha
}

function encodeGitHubPath(path: string) {
  if (path.includes('\\')) throw new Error(`Unsafe GitHub path: ${path}`)
  const segments = path.split('/')
  if (!segments.length || segments.some(segment =>
    !segment
    || segment === '.'
    || segment === '..'
    || !SAFE_GITHUB_PATH_SEGMENT_RE.test(segment),
  )) {
    throw new Error(`Unsafe GitHub path: ${path}`)
  }
  return segments.map(encodeURIComponent).join('/')
}

function githubHeaders(token?: string, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'MagguuUI-WebAdmin',
  }
}

// Module-level state (persists across requests in the same process)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingReasons: string[] = []

function normalizeSyncReason(value: string) {
  let withoutControls = ''
  for (const character of value.normalize('NFKC')) {
    const code = character.codePointAt(0) || 0
    withoutControls += code <= 0x1F || code === 0x7F ? ' ' : character
  }
  const normalized = withoutControls
    .replace(/\s+/g, ' ')
    .trim()
  return (normalized || 'admin-update').slice(0, MAX_SYNC_REASON_LENGTH)
}

/**
 * Queue a GitHub sync. The actual dispatch is debounced —
 * it only fires after DEBOUNCE_MS of inactivity.
 *
 * Every call resets the timer. Reasons are collected and
 * sent together in one dispatch when the timer finally fires.
 */
export async function triggerGitHubSync(reason: string = 'admin-update') {
  const normalizedReason = normalizeSyncReason(reason)
  if (pendingReasons.length < MAX_PENDING_REASONS) {
    pendingReasons.push(normalizedReason)
  } else {
    pendingReasons[MAX_PENDING_REASONS - 1] = 'additional batched changes'
  }

  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Set new timer
  debounceTimer = setTimeout(() => {
    const reasons = [...pendingReasons]
    pendingReasons = []
    debounceTimer = null
    doGitHubDispatch(reasons).catch((err) => {
      console.error('[GitHub] Debounced dispatch failed:', err?.message || err)
    })
  }, DEBOUNCE_MS)

  console.log(`[GitHub] Sync queued (${pendingReasons.length} pending, fires in ${DEBOUNCE_MS / 1000}s): ${normalizedReason}`)
  return { triggered: false, queued: true, pending: pendingReasons.length, reason: normalizedReason }
}

/**
 * Actually send the repository dispatch to GitHub.
 * Called after the debounce timer expires.
 */
async function doGitHubDispatch(reasons: string[]) {
  const config = useRuntimeConfig()

  const token = config.githubToken || ''
  const repoRef = parseGitHubRepo(config.githubRepo || '')

  if (!token || !repoRef) {
    console.warn('[GitHub] Token or repo not configured, skipping sync')
    return
  }

  const { owner, repo } = repoRef
  const combinedReason = reasons.length === 1
    ? reasons[0]
    : `batch: ${reasons.length} changes`

  try {
    await $fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
      },
      body: {
        event_type: 'profile-sync',
        client_payload: {
          reason: combinedReason,
          changes: reasons,
          timestamp: new Date().toISOString(),
        },
      },
    })

    console.log(`[GitHub] Sync dispatched: ${combinedReason}`)

    // Log to sync history
    try {
      db.insert(syncHistory).values({
        triggerSource: 'auto-sync',
        status: 'success',
        details: reasons.length === 1
          ? reasons[0]
          : `Batch sync: ${reasons.join(', ')}`,
      }).run()
    } catch { /* logging is best-effort */ }
  } catch (err: unknown) {
    const { status, message } = parseGitHubError(err)
    const friendly = githubErrorHint(owner, repo, status, message)

    console.error(`[GitHub] Sync dispatch failed: ${friendly}`)

    try {
      db.insert(syncHistory).values({
        triggerSource: 'auto-sync',
        status: 'error',
        details: `${friendly} — Changes: ${reasons.join(', ')}`,
      }).run()
    } catch { /* logging is best-effort */ }
  }
}
