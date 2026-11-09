/**
 * Forever release + WowUp data. Since MagguuUI v12.1.9 Forever ships inside the
 * MagguuUI one-package (Camelot). WowUp strings are read from MagguuUI first;
 * the transitional MagguuUI-Forever repo stays a fallback. NUXT_FOREVER_REPO=off
 * (E2E) disables Forever GitHub lookups and returns null.
 */
import { toForeverRelease, type ForeverRelease } from '~/utils/foreverRelease'
import { fetchGitHubTextFile, parseGitHubRepo } from '~/server/utils/github'
import {
  FOREVER_WOWUP_PATH,
  FOREVER_WOWUP_PATH_LEGACY,
  parseForeverWowupLua,
  type ForeverWowupPacks,
} from '~/utils/foreverWowup'

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

function foreverFeatureOff(): boolean {
  const config = useRuntimeConfig()
  const raw = typeof config.foreverRepo === 'string' ? config.foreverRepo.trim() : ''
  return raw === 'off'
}

function token(): string {
  const config = useRuntimeConfig()
  return typeof config.githubToken === 'string' ? config.githubToken : ''
}

function magguuRepoRef() {
  const config = useRuntimeConfig()
  const raw = typeof config.githubRepo === 'string' ? config.githubRepo.trim() : ''
  const ref = parseGitHubRepo(raw || 'Derpsen/MagguuUI')
  return ref ? { ...ref, token: token() } : null
}

function foreverRepoRef() {
  const config = useRuntimeConfig()
  const raw = typeof config.foreverRepo === 'string' ? config.foreverRepo.trim() : ''
  if (!raw || raw === 'off') return null
  const ref = parseGitHubRepo(raw)
  return ref ? { ...ref, token: token() } : null
}

async function readWowup(owner: string, repo: string, path: string, tok: string): Promise<ForeverWowupPacks | null> {
  try {
    const text = await fetchGitHubTextFile({
      owner,
      repo,
      path,
      ref: 'main',
      token: tok || undefined,
      maxBytes: 64 * 1024,
    })
    return parseForeverWowupLua(text)
  } catch {
    return null
  }
}

let wowupCached: { at: number, value: ForeverWowupPacks | null } | null = null
let wowupInflight: Promise<ForeverWowupPacks | null> | null = null

/**
 * Forever WowUp packs from MagguuUI Camelot (primary), with MagguuUI-Forever as
 * fallback. Null while off or unreadable; public pages keep the fixed addon lists.
 */
export async function getForeverWowup(now = Date.now()): Promise<ForeverWowupPacks | null> {
  if (wowupCached && now - wowupCached.at < TTL_MS) return wowupCached.value
  wowupInflight ??= (async () => {
    if (foreverFeatureOff()) return null
    const primary = magguuRepoRef()
    if (primary) {
      const packs = await readWowup(primary.owner, primary.repo, FOREVER_WOWUP_PATH, primary.token)
      if (packs) return packs
    }
    const legacy = foreverRepoRef()
    if (legacy) {
      return await readWowup(legacy.owner, legacy.repo, FOREVER_WOWUP_PATH_LEGACY, legacy.token)
    }
    return null
  })().finally(() => { wowupInflight = null })
  const value = await wowupInflight
  wowupCached = { at: now, value }
  return value
}
