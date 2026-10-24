/**
 * Client-side full-text matching for the public Ctrl+K search. Every query word
 * must occur (case-insensitive substring) in the label, preview or full body of
 * an entry. Label hits rank above preview hits above body hits. When only the
 * body matches, the hit shows a short snippet around the first match.
 * When that finds nothing, a typo-tolerant fallback accepts words that are one
 * edit (insert, delete, replace) away from a word, or from the start of a word
 * for a half-typed query. Words under 4 characters are never fuzzed.
 * No dependencies; runs over the small lazily loaded /api/v1/search-index.
 */

export interface MatchableEntry {
  id: string
  group: string
  label: string
  text: string
  body?: string
  to: string
}

export interface SearchHit<T extends MatchableEntry = MatchableEntry> {
  entry: T
  snippet: string
  score: number
}

const MAX_TOKENS = 6
const SNIPPET_RADIUS = 60
const MIN_FUZZY_LENGTH = 4

/** True when a and b differ by at most one insert, delete or replace. */
export function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (i === a.length && i === b.length) return true
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  return short.slice(i) === long.slice(i + 1)
}

/** A word is close to the token when the token is one edit from the word or from its first token-length (+-1) letters. */
function fuzzyWordMatch(token: string, haystack: string): boolean {
  for (const word of haystack.split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < token.length - 1) continue
    for (let n = token.length - 1; n <= token.length + 1; n++) {
      if (n <= word.length && withinOneEdit(token, word.slice(0, n))) return true
    }
  }
  return false
}

export function queryTokens(term: string): string[] {
  return term.toLowerCase().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS)
}

function snippetAround(body: string, tokens: string[]): string {
  const lower = body.toLowerCase()
  let at = -1
  for (const token of tokens) {
    const i = lower.indexOf(token)
    if (i !== -1 && (at === -1 || i < at)) at = i
  }
  if (at === -1) return body.slice(0, SNIPPET_RADIUS * 2)
  const start = Math.max(0, at - SNIPPET_RADIUS)
  const end = Math.min(body.length, at + SNIPPET_RADIUS * 2)
  return `${start > 0 ? '…' : ''}${body.slice(start, end).trim()}${end < body.length ? '…' : ''}`
}

export function searchEntries<T extends MatchableEntry>(
  entries: readonly T[],
  term: string,
  options: { perGroup?: number } = {},
): SearchHit<T>[] {
  const perGroup = options.perGroup ?? 5
  const tokens = queryTokens(term)
  const hits: SearchHit<T>[] = []

  if (!tokens.length) {
    // No query: the first few entries of each group, in index order.
    const counts = new Map<string, number>()
    for (const entry of entries) {
      const n = counts.get(entry.group) ?? 0
      if (n >= perGroup) continue
      counts.set(entry.group, n + 1)
      hits.push({ entry, snippet: entry.text, score: 0 })
    }
    return hits
  }

  for (const entry of entries) {
    const label = entry.label.toLowerCase()
    const text = entry.text.toLowerCase()
    const body = (entry.body ?? '').toLowerCase()
    let score = 0
    let bodyOnly = false
    let ok = true
    for (const token of tokens) {
      if (label.includes(token)) score += label.startsWith(token) ? 15 : 10
      else if (text.includes(token)) score += 4
      else if (body.includes(token)) { score += 1; bodyOnly = true }
      else { ok = false; break }
    }
    if (!ok) continue
    hits.push({ entry, snippet: bodyOnly && entry.body ? snippetAround(entry.body, tokens) : entry.text, score })
  }

  if (!hits.length) {
    // Typo fallback, only when the strict pass found nothing at all.
    for (const entry of entries) {
      const label = entry.label.toLowerCase()
      const text = entry.text.toLowerCase()
      const body = (entry.body ?? '').toLowerCase()
      let score = 0
      let ok = true
      for (const token of tokens) {
        const fuzzy = token.length >= MIN_FUZZY_LENGTH
        if (label.includes(token) || (fuzzy && fuzzyWordMatch(token, label))) score += 3
        else if (text.includes(token) || (fuzzy && fuzzyWordMatch(token, text))) score += 2
        else if (body.includes(token) || (fuzzy && fuzzyWordMatch(token, body))) score += 1
        else { ok = false; break }
      }
      if (ok) hits.push({ entry, snippet: entry.text, score })
    }
  }

  // Stable: equal scores keep index order (guide steps in order, newest release first).
  const ranked = hits
    .map((hit, i) => ({ hit, i }))
    .sort((a, b) => b.hit.score - a.hit.score || a.i - b.i)
    .map(x => x.hit)
  const counts = new Map<string, number>()
  return ranked.filter((hit) => {
    const n = counts.get(hit.entry.group) ?? 0
    if (n >= perGroup) return false
    counts.set(hit.entry.group, n + 1)
    return true
  })
}
