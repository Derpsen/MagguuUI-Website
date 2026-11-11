/**
 * Injectable HTTP for Blizzard APIs. Tests pass a stub; the nightly job uses
 * ofetch. Never logs Authorization headers or tokens. Retries 429 with
 * Retry-After backoff (capped).
 */

import { ofetch } from 'ofetch'
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

export const BLIZZARD_RETRY_AFTER_CAP_MS = 30_000
export const BLIZZARD_MAX_RETRIES = 3

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

function headerBag(headers: Headers | Record<string, string> | undefined): { get(name: string): string | null } {
  if (headers && typeof (headers as Headers).get === 'function') return headers as Headers
  const rec = (headers ?? {}) as Record<string, string>
  return {
    get(name: string) {
      const key = Object.keys(rec).find(k => k.toLowerCase() === name.toLowerCase())
      return key == null ? null : rec[key] ?? null
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
      timeout: 15_000,
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
    now?: number
    secrets?: readonly string[]
    maxRetries?: number
  } = {},
): Promise<BlizzardHttpResponse> {
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const maxRetries = options.maxRetries ?? BLIZZARD_MAX_RETRIES
  let attempt = 0
  while (true) {
    const res = await fetcher(input)
    if (res.status !== 429 || attempt >= maxRetries) {
      if (res.status >= 400) {
        const hint = sanitizeBlizzardLog(`Blizzard HTTP ${res.status} for ${input.method} ${input.url}`, options.secrets ?? [])
        throw new Error(hint)
      }
      return res
    }
    attempt += 1
    const wait = parseRetryAfterMs(res.headers.get('retry-after'), options.now ?? Date.now())
    await sleep(wait)
  }
}
