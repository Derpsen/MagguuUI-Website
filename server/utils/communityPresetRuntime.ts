/**
 * Process-wide state for the public preset submission endpoints: limiters, the replay guard
 * and the form-token secret. Pinned to globalThis so HMR does not duplicate them. Everything
 * here is in memory only; the IP is reduced to a daily-salted hash and never stored.
 */
import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { anonymousKey, dailySalt } from '~/server/utils/analytics'
import { createReplayGuard, createWindowLimiter } from '~/server/utils/communityPresets'

interface Runtime {
  replay: ReturnType<typeof createReplayGuard>
  attempts: ReturnType<typeof createWindowLimiter>
  accepted: ReturnType<typeof createWindowLimiter>
  tokens: ReturnType<typeof createWindowLimiter>
  fallbackSecret: string
}

// Playwright only (NUXT_E2E_SEED, never in production): the browser tests submit from one address many times.
const e2e = process.env.NUXT_E2E_SEED === 'true' && process.env.NODE_ENV !== 'production'
const scale = e2e ? 1000 : 1

const g = globalThis as unknown as { __presetRuntime?: Runtime }
const rt: Runtime = g.__presetRuntime ?? (g.__presetRuntime = {
  replay: createReplayGuard(),
  // Every POST (valid or not) counts as an attempt; only accepted submissions count as accepted.
  attempts: createWindowLimiter(15 * scale, 3600_000),
  accepted: createWindowLimiter(3 * scale, 3600_000),
  tokens: createWindowLimiter(30 * scale, 3600_000),
  fallbackSecret: randomBytes(32).toString('hex'),
})

export const presetReplay = rt.replay
export const presetAttempts = rt.attempts
export const presetAccepted = rt.accepted
export const presetTokens = rt.tokens

/** Signing secret for form tokens: the app secret when configured, else a per-process random one. */
export function presetFormSecret(): string {
  return useRuntimeConfig().jwtSecret || rt.fallbackSecret
}

/** Opaque per-day key for the in-memory limiters. Not reversible, not stored. */
export function presetClientKey(event: H3Event): string {
  return anonymousKey(dailySalt.get(), getClientIp(event))
}

/** A browser sends Origin on POST; a different site must not be able to submit on a visitor's behalf. */
export function assertSameOriginIfPresent(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (!origin) return
  let host: string
  try { host = new URL(origin).host } catch { throw createError({ statusCode: 403, message: 'Invalid Origin header' }) }
  if (host !== getRequestHost(event)) throw createError({ statusCode: 403, message: 'Cross-origin request blocked' })
}
