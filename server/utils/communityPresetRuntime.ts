/**
 * Process-wide state for the public preset submission endpoints: limiters, the replay guard
 * and the form-token secret. Pinned to globalThis so HMR does not duplicate them. Everything
 * here is in memory only; the IP is reduced to a daily-salted hash and never stored.
 *
 * Two granularities: the visitor key is the salted /64 (IPv4: the address), the group key the
 * salted /48 (IPv4: /24). The group limits stop one network that rotates through its /64s from
 * using up the global daily cap or the review queue alone.
 */
import type Database from 'better-sqlite3'
import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { anonymousKey, dailySalt } from '~/server/utils/analytics'
import { getClientIp, rateLimitGroupKey, rateLimitIpKey } from '~/server/utils/clientIp'
import { createReplayGuard, createWindowLimiter } from '~/server/utils/communityPresets'
import { presetSubmissionLimits } from '~/server/utils/presetLimits'
import type { SubmissionDeps } from '~/server/utils/presetSubmission'

type Runtime = ReturnType<typeof presetSubmissionLimits> & {
  replay: ReturnType<typeof createReplayGuard>
  tokens: ReturnType<typeof createWindowLimiter>
  /** Different on every start: form tokens issued before a restart no longer verify (replay guard is in memory). */
  bootId: string
  fallbackSecret: string
}

// Playwright only (NUXT_E2E_SEED, never in production): the browser tests submit from one address many times.
const e2e = process.env.NUXT_E2E_SEED === 'true' && process.env.NODE_ENV !== 'production'
const scale = e2e ? 1000 : 1

const g = globalThis as unknown as { __presetRuntime?: Runtime }
const rt: Runtime = g.__presetRuntime ?? (g.__presetRuntime = {
  ...presetSubmissionLimits(scale),
  replay: createReplayGuard(),
  tokens: createWindowLimiter(30 * scale, 3600_000),
  bootId: randomBytes(8).toString('hex'),
  fallbackSecret: randomBytes(32).toString('hex'),
})

export const presetTokens = rt.tokens

/** Signing secret for form tokens: the app secret (or a per-process random one) bound to this process start. */
export function presetFormSecret(): string {
  return `${useRuntimeConfig().jwtSecret || rt.fallbackSecret}|${rt.bootId}`
}

/** Opaque per-day key for the in-memory limiters. Not reversible, not stored. */
export function presetClientKey(event: H3Event): string {
  return anonymousKey(dailySalt.get(), rateLimitIpKey(getClientIp(event)))
}

function presetKeys(event: H3Event) {
  const ip = getClientIp(event)
  const salt = dailySalt.get()
  return { client: anonymousKey(salt, rateLimitIpKey(ip)), group: anonymousKey(salt, `g|${rateLimitGroupKey(ip)}`) }
}

export function presetSubmissionDeps(sqlite: Pick<Database.Database, 'prepare' | 'transaction'>): SubmissionDeps {
  return {
    sqlite,
    secret: presetFormSecret,
    keys: presetKeys,
    attempts: rt.attempts,
    attemptsGroup: rt.attemptsGroup,
    accepted: rt.accepted,
    acceptedDay: rt.acceptedDay,
    acceptedGroup: rt.acceptedGroup,
    replay: rt.replay,
  }
}
