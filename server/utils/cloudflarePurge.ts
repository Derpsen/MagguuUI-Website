/**
 * Optional Cloudflare edge purge. Public pages and /api/v1/catalog-summary send
 * `CDN-Cache-Control` / `Cloudflare-CDN-Cache-Control` (see publicCache.ts), so
 * Cloudflare may hold them for up to CDN_MAX_AGE_SECONDS. When an admin, sync, or
 * webhook write clears the Nitro route cache, the edge copy is purged too.
 *
 * Needs CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN (token scope: Zone → Cache
 * Purge → Purge). Without them this is a logged no-op.
 */

export interface CloudflarePurgeEnv {
  [key: string]: string | undefined
  CLOUDFLARE_ZONE_ID?: string
  CLOUDFLARE_API_TOKEN?: string
}

export type PurgeResult = 'purged' | 'skipped' | 'failed'

type FetchLike = (url: string, init: { method: string, headers: Record<string, string>, body: string }) => Promise<{ ok: boolean, status: number, text: () => Promise<string> }>

let warnedMissing = false

export function cloudflarePurgeConfigured(env: CloudflarePurgeEnv = process.env): boolean {
  return Boolean(env.CLOUDFLARE_ZONE_ID?.trim() && env.CLOUDFLARE_API_TOKEN?.trim())
}

/** Purge the whole zone cache. The zone only serves this site; hashed /_nuxt assets refill on demand. */
export async function purgeCloudflareCache(
  env: CloudflarePurgeEnv = process.env,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<PurgeResult> {
  const zone = env.CLOUDFLARE_ZONE_ID?.trim()
  const token = env.CLOUDFLARE_API_TOKEN?.trim()
  if (!zone || !token) {
    if (!warnedMissing) {
      console.info('[Cache] Cloudflare purge skipped: CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN not set')
      warnedMissing = true
    }
    return 'skipped'
  }
  try {
    const res = await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zone)}/purge_cache`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ purge_everything: true }),
    })
    if (!res.ok) {
      console.error(`[Cache] Cloudflare purge failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
      return 'failed'
    }
    console.info('[Cache] Cloudflare cache purged')
    return 'purged'
  } catch (err) {
    console.error('[Cache] Cloudflare purge failed:', err)
    return 'failed'
  }
}

let pending: Promise<PurgeResult> | null = null
let timer: ReturnType<typeof setTimeout> | null = null

/**
 * Coalesce bursts (bulk saves, sync runs fire many writes) into one purge call
 * shortly after the last write. Fire-and-forget; never throws.
 */
export function schedulePurgeCloudflareCache(delayMs = 1500): void {
  if (!cloudflarePurgeConfigured()) {
    void purgeCloudflareCache()
    return
  }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    pending = purgeCloudflareCache().finally(() => { pending = null })
  }, delayMs)
  timer.unref?.()
}

export function pendingCloudflarePurge(): Promise<PurgeResult> | null {
  return pending
}
