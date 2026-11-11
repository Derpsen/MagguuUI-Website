/**
 * GitHub API rate-limit bookkeeping. In-process only (one Node in the container).
 * 429 and rate-limit 403 are soft: callers skip or back off instead of hammering.
 */

export interface GithubRateLimitState {
  remaining: number
  resetAt: number
  limit?: number
}

export class GitHubRateLimitError extends Error {
  readonly status: number
  readonly resetAt: number | null
  readonly remaining: number | null
  constructor(message: string, opts: { status?: number, resetAt?: number | null, remaining?: number | null } = {}) {
    super(message)
    this.name = 'GitHubRateLimitError'
    this.status = opts.status ?? 429
    this.resetAt = opts.resetAt ?? null
    this.remaining = opts.remaining ?? null
  }
}

export function isGitHubRateLimitError(err: unknown): err is GitHubRateLimitError {
  return err instanceof GitHubRateLimitError
}

function headerGet(headers: unknown, name: string): string {
  if (!headers) return ''
  const lower = name.toLowerCase()
  if (typeof (headers as { get?: (n: string) => string | null }).get === 'function') {
    const h = headers as { get: (n: string) => string | null }
    return h.get(name) || h.get(lower) || ''
  }
  const rec = headers as Record<string, unknown>
  const raw = rec[name] ?? rec[lower] ?? rec[name.replace(/(^|-)([a-z])/g, (_, p, c) => p + c.toUpperCase())]
  return raw == null ? '' : String(raw)
}

export function parseRateLimitHeaders(headers: unknown): GithubRateLimitState | null {
  const remainingRaw = headerGet(headers, 'x-ratelimit-remaining')
  const resetRaw = headerGet(headers, 'x-ratelimit-reset')
  if (remainingRaw === '' && resetRaw === '') return null
  const remaining = Number(remainingRaw)
  const resetAt = Number(resetRaw)
  const limit = Number(headerGet(headers, 'x-ratelimit-limit'))
  return {
    remaining: Number.isFinite(remaining) ? remaining : 0,
    resetAt: Number.isFinite(resetAt) ? resetAt : 0,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  }
}

export function isGithubRateLimitResponse(status: number | undefined, message: string, headers?: unknown): boolean {
  if (status === 429) return true
  if (status !== 403) return false
  const parsed = parseRateLimitHeaders(headers)
  if (parsed && parsed.remaining === 0) return true
  return /rate limit|secondary rate/i.test(message || '')
}

let state: GithubRateLimitState | null = null

export function rememberGithubRateLimit(headers: unknown, now = Date.now()): GithubRateLimitState | null {
  const parsed = parseRateLimitHeaders(headers)
  if (!parsed) return state
  // A 0 reset is meaningless; keep the previous reset if the new one is missing.
  if (!parsed.resetAt && state?.resetAt && state.resetAt * 1000 > now) {
    parsed.resetAt = state.resetAt
  }
  state = parsed
  return state
}

export function getGithubRateLimitState(): GithubRateLimitState | null {
  return state ? { ...state } : null
}

export function resetGithubRateLimitState() {
  state = null
}

/** True when the last response said remaining=0 and the reset is still in the future. */
export function shouldSkipGithubCall(now = Date.now()): boolean {
  if (!state) return false
  if (state.remaining > 0) return false
  return state.resetAt * 1000 > now
}

export function githubRateLimitSkipReason(now = Date.now()): string {
  const resetAt = state?.resetAt
  if (!resetAt) return 'GitHub rate limit reached; try again later'
  const when = new Date(resetAt * 1000)
  const iso = Number.isNaN(when.getTime()) ? 'later' : when.toISOString()
  const wait = Math.max(0, Math.ceil((resetAt * 1000 - now) / 1000))
  return `GitHub rate limit reached; retry after ${iso} (${wait}s)`
}

export function rateLimitErrorFrom(status: number | undefined, _message: string, headers?: unknown, now = Date.now()): GitHubRateLimitError {
  rememberGithubRateLimit(headers, now)
  const retryAfter = Number(headerGet(headers, 'retry-after'))
  const current = getGithubRateLimitState()
  let resetAt = current?.resetAt || 0
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const fromRetry = Math.floor(now / 1000) + retryAfter
    if (fromRetry > resetAt) resetAt = fromRetry
    if (!current) rememberGithubRateLimit({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetAt) }, now)
    else rememberGithubRateLimit({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetAt) }, now)
  }
  return new GitHubRateLimitError(githubRateLimitSkipReason(now), {
    status: status ?? 429,
    resetAt: resetAt || null,
    remaining: 0,
  })
}
