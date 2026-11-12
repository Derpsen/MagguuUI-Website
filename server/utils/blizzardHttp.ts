/**
 * Injectable HTTP for Blizzard APIs. Tests pass a stub; the nightly job uses
 * ofetch. Never logs Authorization headers or tokens.
 *
 * Retries 429/5xx (Retry-After when present, otherwise exponential backoff +
 * jitter) up to 6 attempts, then counts the item as failed. 404/403 are not
 * retried. 401 can refresh the token once. Optional global rate gate (≤ 40
 * rps, hard cap 50) and concurrency limit. A 429 pauses the whole gate until
 * Retry-After (waiting requests re-check so a stale slot cannot fire during
 * the pause) and halves the current rps, which then climbs back toward the
 * target after a run of clean responses.
 */

import { ofetch } from 'ofetch'
import { META_CONCURRENCY, META_MAX_RPS, META_REQUEST_TIMEOUT_MS } from '~/utils/metaTypes'
import { sanitizeBlizzardLog } from './blizzardAuth'

export type BlizzardHttpResponse = {
  status: number
  headers: { get(name: string): string | null }
  body: unknown
}

export type BlizzardFetcher = (input: {
  method: 'GET' | 'POST'
  url: string
  headers: Record<string, string>
  body?: string
}) => Promise<BlizzardHttpResponse>

export type BlizzardHttpStats = {
  calls: number
  retries: number
  http429: number
  http404: number
  http401: number
  http403: number
  http5xx: number
  networkErrors: number
  failedAfterRetries: number
}

export const BLIZZARD_RETRY_AFTER_CAP_MS = 30_000
export const BLIZZARD_MAX_RETRIES = 5
export const BLIZZARD_MAX_ATTEMPTS = 6
export const BLIZZARD_HARD_RPS_CAP = 50
export const BLIZZARD_REQUEST_TIMEOUT_MS = META_REQUEST_TIMEOUT_MS

export function createBlizzardHttpStats(): BlizzardHttpStats {
  return {
    calls: 0,
    retries: 0,
    http429: 0,
    http404: 0,
    http401: 0,
    http403: 0,
    http5xx: 0,
    networkErrors: 0,
    failedAfterRetries: 0,
  }
}

export function parseRetryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return 1_000
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    return Math.min(Number(trimmed) * 1000, BLIZZARD_RETRY_AFTER_CAP_MS)
  }
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return 1_000
  return Math.min(Math.max(0, date - now), BLIZZARD_RETRY_AFTER_CAP_MS)
}

function retryWaitMs(retryAfter: string | null, attempt: number, now: number, jitter: () => number): number {
  if (retryAfter) return parseRetryAfterMs(retryAfter, now)
  const exp = Math.min(500 * 2 ** attempt, BLIZZARD_RETRY_AFTER_CAP_MS)
  return Math.min(exp + Math.max(0, Math.floor(jitter())), BLIZZARD_RETRY_AFTER_CAP_MS)
}

function headerBag(headers: Headers | Record<string, string> | undefined): { get(name: string): string | null } {
  if (headers && typeof (headers as Headers).get === 'function') return headers as Headers
  const rec = (headers ?? {}) as Record<string, string>
  return {
    get(name) {
      const key = Object.keys(rec).find(k => k.toLowerCase() === name.toLowerCase())
      return key == null ? null : rec[key] ?? null
    },
  }
}

export type BlizzardTraffic = {
  run: <T>(fn: () => Promise<T>) => Promise<T>
  pauseUntil: (untilMs: number) => void
  noteThrottle: () => void
  noteSuccess: () => void
}

export function createBlizzardTraffic(options: {
  maxRps?: number
  concurrency?: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
} = {}): BlizzardTraffic {
  const maxRps = Math.min(Math.max(1, options.maxRps ?? META_MAX_RPS), BLIZZARD_HARD_RPS_CAP)
  const concurrency = Math.max(1, options.concurrency ?? META_CONCURRENCY)
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const now = options.now ?? (() => Date.now())
  const targetGap = 1000 / maxRps
  const minRps = Math.min(maxRps, 8)
  const maxGap = 1000 / minRps
  let gap = targetGap
  let healthy = 0
  let nextSlot = 0
  let active = 0
  let lastThrottleAt = Number.NEGATIVE_INFINITY
  const queue: Array<() => void> = []

  return {
    pauseUntil(untilMs) {
      nextSlot = Math.max(nextSlot, untilMs)
    },
    noteThrottle() {
      const t = now()
      // A parallel 429 wave must halve rps only once; later signals in the
      // same gap only extend the pause.
      if (Number.isFinite(lastThrottleAt) && t - lastThrottleAt < gap) {
        nextSlot = Math.max(nextSlot, t + gap)
        return
      }
      lastThrottleAt = t
      gap = Math.min(maxGap, Math.max(gap * 2, targetGap * 2))
      healthy = 0
      nextSlot = Math.max(nextSlot, t + gap)
    },
    noteSuccess() {
      healthy += 1
      if (healthy >= 80 && gap > targetGap) {
        gap = Math.max(targetGap, gap / 2)
        healthy = 0
      }
    },
    async run(fn) {
      if (active >= concurrency) await new Promise<void>(resolve => { queue.push(resolve) })
      active += 1
      try {
        // Re-check nextSlot after every sleep so pauseUntil (Retry-After) can
        // still hold a waiter that had already started waiting on a stale slot.
        // If the test clock is frozen, a completed sleep is treated as having
        // reached `at`.
        for (;;) {
          const start = now()
          const at = Math.max(start, nextSlot)
          if (at > start) await sleep(at - start)
          const arrived = Math.max(now(), at)
          if (arrived < nextSlot) continue
          nextSlot = arrived + gap
          return await fn()
        }
      } finally {
        active -= 1
        queue.shift()?.()
      }
    },
  }
}

/**
 * Production fetcher. Unit tests must not call this — they inject a stub so
 * no network happens. If NODE_ENV is `test`, this throws.
 */
export function createOfetchBlizzardFetcher(): BlizzardFetcher {
  return async (input) => {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('Blizzard network is disabled in tests')
    }
    const res = await ofetch.raw(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body,
      timeout: BLIZZARD_REQUEST_TIMEOUT_MS,
      ignoreResponseError: true,
    })
    return {
      status: res.status,
      headers: headerBag(res.headers as Headers),
      body: res._data,
    }
  }
}

export async function blizzardRequest(
  fetcher: BlizzardFetcher,
  input: { method: 'GET' | 'POST', url: string, headers: Record<string, string>, body?: string },
  options: {
    sleep?: (ms: number) => Promise<void>
    now?: number | (() => number)
    secrets?: readonly string[]
    maxRetries?: number
    maxAttempts?: number
    stats?: BlizzardHttpStats
    jitter?: () => number
    traffic?: BlizzardTraffic
    onUnauthorized?: () => Promise<void> | void
    soft?: boolean
  } = {},
): Promise<BlizzardHttpResponse> {
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const maxAttempts = options.maxAttempts ?? ((options.maxRetries != null ? options.maxRetries + 1 : BLIZZARD_MAX_ATTEMPTS))
  const jitter = options.jitter ?? (() => Math.floor(Math.random() * 250))
  const clock = () => typeof options.now === 'function' ? options.now() : (options.now ?? Date.now())
  let refreshed401 = false
  let last: BlizzardHttpResponse | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: BlizzardHttpResponse
    try {
      res = options.traffic ? await options.traffic.run(() => fetcher(input)) : await fetcher(input)
    } catch (err) {
      if (options.stats) {
        options.stats.calls += 1
        options.stats.networkErrors += 1
        options.stats.retries += 1
      }
      if (attempt + 1 >= maxAttempts) {
        if (options.stats) options.stats.failedAfterRetries += 1
        if (options.soft) {
          return { status: 0, headers: headerBag({}), body: null }
        }
        const hint = sanitizeBlizzardLog(err instanceof Error ? err.message : 'Blizzard request failed', options.secrets ?? [])
        throw new Error(hint, { cause: err })
      }
      await sleep(retryWaitMs(null, attempt, clock(), jitter))
      continue
    }

    if (options.stats) {
      options.stats.calls += 1
      if (res.status === 429) options.stats.http429 += 1
      if (res.status === 404) options.stats.http404 += 1
      if (res.status === 401) options.stats.http401 += 1
      if (res.status === 403) options.stats.http403 += 1
      if (res.status >= 500) options.stats.http5xx += 1
    }
    last = res

    if (res.status === 401 && options.onUnauthorized && !refreshed401) {
      refreshed401 = true
      if (options.stats) options.stats.retries += 1
      await options.onUnauthorized()
      continue
    }

    if (res.status === 404 || res.status === 403) {
      options.traffic?.noteSuccess()
      return res
    }

    const retryable = res.status === 429 || res.status >= 500
    if (retryable && attempt + 1 < maxAttempts) {
      if (options.stats) options.stats.retries += 1
      const retryAfter = res.headers.get('retry-after')
      const wait = retryWaitMs(retryAfter, attempt, clock(), jitter)
      if (res.status === 429 && options.traffic) {
        options.traffic.pauseUntil(clock() + wait)
        options.traffic.noteThrottle()
      }
      await sleep(wait)
      continue
    }

    if (res.status >= 400) {
      if (options.soft) return res
      const hint = sanitizeBlizzardLog(`Blizzard HTTP ${res.status} for ${input.method} ${input.url}`, options.secrets ?? [])
      throw new Error(hint)
    }
    options.traffic?.noteSuccess()
    return res
  }

  if (options.stats) options.stats.failedAfterRetries += 1
  if (last && (options.soft || last.status === 404 || last.status === 403)) return last
  if (last && last.status >= 400 && !options.soft) {
    const hint = sanitizeBlizzardLog(`Blizzard HTTP ${last.status} for ${input.method} ${input.url}`, options.secrets ?? [])
    throw new Error(hint)
  }
  return last ?? { status: 0, headers: headerBag({}), body: null }
}
