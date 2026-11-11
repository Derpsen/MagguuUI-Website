/**
 * Parse Buddy-style news markdown (YAML frontmatter + body).
 * First source becomes sourceUrl/sourceName; remaining sources are appended
 * as a Sources list in the body when that heading is not already present.
 */

import { NEWS_AUTHOR, NEWS_SUMMARY_MAX, NEWS_UNPUBLISHED_SEED_SLUG, isNewsSlug, parseNewsTags, publishedAtFromDate, sourceNameFromUrl } from './news'

export type ParsedNewsMarkdown = {
  slug: string
  title: string
  summary: string
  body: string
  sourceUrl: string | null
  sourceName: string | null
  sources: string[]
  publishedAt: number
  tags: string[]
  author: typeof NEWS_AUTHOR
  isPublished: boolean
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFrontmatter(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  let currentList: string[] | null = null
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '  ')
    const listItem = line.match(/^\s+-\s+(.*)$/)
    if (listItem && currentList) {
      currentList.push(unquote(listItem[1] || ''))
      continue
    }
    const pair = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/)
    if (!pair) continue
    currentList = null
    const key = pair[1] || ''
    const rest = (pair[2] || '').trim()
    if (rest === '') {
      currentList = []
      out[key] = currentList
      continue
    }
    out[key] = unquote(rest)
  }
  return out
}

export function appendSourcesToBody(body: string, sources: string[]): string {
  const extra = sources.slice(1)
  if (!extra.length) return body.trim()
  if (/^##\s+Sources\s*$/m.test(body)) return body.trim()
  const lines = extra.map((url) => `- [${sourceNameFromUrl(url)}](${url})`)
  return `${body.trim()}\n\n## Sources\n\n${lines.join('\n')}`
}

export function parseNewsMarkdown(source: string, options: { unpublishedSlug?: string } = {}): ParsedNewsMarkdown | null {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const meta = parseFrontmatter(match[1] || '')
  const title = String(meta.title || '').trim()
  const slug = String(meta.slug || '').trim()
  const summary = String(meta.summary || '').trim()
  if (!title || !isNewsSlug(slug) || !summary || summary.length > NEWS_SUMMARY_MAX) return null
  const publishedAt = publishedAtFromDate(String(meta.date || '').trim())
  if (publishedAt == null) return null
  const sources = Array.isArray(meta.sources)
    ? (meta.sources as unknown[]).map(item => String(item).trim()).filter(Boolean)
    : []
  const first = sources[0] || null
  const unpublishedSlug = options.unpublishedSlug ?? NEWS_UNPUBLISHED_SEED_SLUG
  return {
    slug,
    title,
    summary,
    body: appendSourcesToBody(match[2] || '', sources),
    sourceUrl: first,
    sourceName: first ? sourceNameFromUrl(first) : null,
    sources,
    publishedAt,
    tags: parseNewsTags(meta.tags),
    author: NEWS_AUTHOR,
    isPublished: slug !== unpublishedSlug,
  }
}
