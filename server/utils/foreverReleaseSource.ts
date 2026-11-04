/**
 * Newest MagguuUI x Forever release, read from GitHub with the same releases/latest
 * call the Retail version check uses, but for the Forever repo (runtimeConfig.foreverRepo,
 * NUXT_FOREVER_REPO; "off" disables it, which the E2E server uses). The Retail token is
 * sent when set; without access, a private or empty repo answers 404 and the result is
 * null ("Coming soon"). Every error is null too, and results are kept 10 minutes so
 * public page views never fan out to api.github.com.
 */
import { toForeverRelease, type ForeverRelease } from '~/utils/foreverRelease'
import { fetchGitHubTextFile, parseGitHubRepo } from '~/server/utils/github'
import { FOREVER_WOWUP_PATH, parseForeverWowupLua, type ForeverWowup } from '~/utils/foreverWowup'

const TTL_MS = 10 * 60 * 1000
let cached: { at: number, value: ForeverRelease | null } | null = null
let inflight: Promise<ForeverRelease | null> | null = null

async function load(): Promise<ForeverRelease | null> {
  const config = useRuntimeConfig()
  const raw = typeof config.foreverRepo === 'string' ? config.foreverRepo.trim() : ''
  if (!raw || raw === 'off') return null
  const ref = parseGitHubRepo(raw)
  if (!ref) return null
  const token = typeof config.githubToken === 'string' ? config.githubToken : ''
  const headers = {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'User-Agent': 'MagguuUI-WebAdmin',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const base = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`
  try {
    const [repo, release] = await Promise.all([
      $fetch<{ private?: boolean }>(base, { headers, timeout: 8000 }),
      $fetch<unknown>(`${base}/releases/latest`, { headers, timeout: 8000 }),
    ])
    return toForeverRelease(release, repo?.private === false)
  } catch {
    return null
  }
}

export async function getForeverRelease(now = Date.now()): Promise<ForeverRelease | null> {
  if (cached && now - cached.at < TTL_MS) return cached.value
  inflight ??= load().finally(() => { inflight = null })
  const value = await inflight
  cached = { at: now, value }
  return value
}

/** Shared config read: null when the lookup is off or the repo setting is invalid. */
function foreverRepoRef() {
  const config = useRuntimeConfig()
  const raw = typeof config.foreverRepo === 'string' ? config.foreverRepo.trim() : ''
  if (!raw || raw === 'off') return null
  const ref = parseGitHubRepo(raw)
  if (!ref) return null
  return { ...ref, token: typeof config.githubToken === 'string' ? config.githubToken : '' }
}

let wowupCached: { at: number, value: ForeverWowup | null } | null = null
let wowupInflight: Promise<ForeverWowup | null> | null = null

/**
 * The Forever WowUp string, read from the Forever repo at runtime (default branch), so a new
 * string needs no website deploy. Same token, cache window and null-on-error rule as the release.
 */
export async function getForeverWowup(now = Date.now()): Promise<ForeverWowup | null> {
  if (wowupCached && now - wowupCached.at < TTL_MS) return wowupCached.value
  wowupInflight ??= (async () => {
    const ref = foreverRepoRef()
    if (!ref) return null
    try {
      const text = await fetchGitHubTextFile({ owner: ref.owner, repo: ref.repo, path: FOREVER_WOWUP_PATH, ref: 'main', token: ref.token || undefined, maxBytes: 64 * 1024 })
      return parseForeverWowupLua(text)
    } catch {
      return null
    }
  })().finally(() => { wowupInflight = null })
  const value = await wowupInflight
  wowupCached = { at: now, value }
  return value
}
