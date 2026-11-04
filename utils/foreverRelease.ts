/**
 * Public shape of the newest MagguuUI x Forever release (GitHub releases/latest
 * of the Forever repo). Pure and defensive: anything unexpected becomes null,
 * which the pages show as "Coming soon". Links are only exposed while the repo
 * is public, because a private repo's release links 404 for visitors.
 */

export interface ForeverReleaseAsset { name: string, url: string, size: number }

export interface ForeverRelease {
  version: string
  name: string
  publishedAt: string | null
  url: string | null
  assets: ForeverReleaseAsset[]
}

const GITHUB_URL = /^https:\/\/github\.com\//

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function toForeverRelease(raw: unknown, repoIsPublic: boolean): ForeverRelease | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.draft === true || r.prerelease === true) return null
  const version = str(r.tag_name)
  if (!version) return null
  const htmlUrl = str(r.html_url)
  const assets = repoIsPublic && Array.isArray(r.assets)
    ? r.assets.flatMap((a): ForeverReleaseAsset[] => {
        if (!a || typeof a !== 'object') return []
        const asset = a as Record<string, unknown>
        const name = str(asset.name)
        const url = str(asset.browser_download_url)
        if (!name || !GITHUB_URL.test(url)) return []
        return [{ name, url, size: typeof asset.size === 'number' && asset.size > 0 ? asset.size : 0 }]
      })
    : []
  const publishedAt = str(r.published_at)
  return {
    version,
    name: str(r.name) || version,
    publishedAt: publishedAt && !Number.isNaN(Date.parse(publishedAt)) ? publishedAt : null,
    url: repoIsPublic && GITHUB_URL.test(htmlUrl) ? htmlUrl : null,
    assets,
  }
}
