/**
 * Optional Uptime Kuma push after each Meta nightly. The push URL is a secret
 * (token in the path) and must never be logged. Missing URL = logged no-op.
 */

export type MetaKumaStatus = 'up' | 'down'

type FetchLike = (url: string, init: { method: string }) => Promise<{ ok: boolean, status: number }>

export function metaKumaPushConfigured(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim())
}

export function buildMetaKumaPushUrl(base: string, status: MetaKumaStatus, msg: string): string {
  const url = new URL(base.trim())
  url.searchParams.set('status', status)
  url.searchParams.set('msg', msg.replace(/[\r\n]+/g, ' ').slice(0, 180))
  return url.toString()
}

export async function pushMetaKuma(
  baseUrl: unknown,
  status: MetaKumaStatus,
  msg: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<'pushed' | 'skipped' | 'failed'> {
  if (!metaKumaPushConfigured(baseUrl)) {
    console.info('[blizzard:nightly] Kuma push skipped: NUXT_META_KUMA_PUSH_URL not set')
    return 'skipped'
  }
  try {
    const res = await fetchImpl(buildMetaKumaPushUrl(baseUrl, status, msg), { method: 'GET' })
    if (!res.ok) {
      console.error(`[blizzard:nightly] Kuma push failed: HTTP ${res.status}`)
      return 'failed'
    }
    console.info(`[blizzard:nightly] Kuma push ${status}`)
    return 'pushed'
  } catch {
    console.error('[blizzard:nightly] Kuma push failed')
    return 'failed'
  }
}

export function kumaStatusForMetaRun(status: 'ok' | 'partial' | 'error' | 'skipped' | 'locked'): MetaKumaStatus {
  return status === 'ok' || status === 'skipped' ? 'up' : 'down'
}
