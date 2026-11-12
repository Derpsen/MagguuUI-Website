/**
 * Sanity gates before a staged Meta snapshot is promoted to the active pointer.
 */

import { META_CLASSES } from '~/utils/metaCatalog'
import {
  META_MAX_429_RATE,
  META_MIN_PROFILE_SUCCESS_RATIO,
  META_MIN_BUILD_SAMPLE,
  META_MIN_SHOW_SAMPLE,
  META_SANITY_N_FLOOR_RATIO,
  META_SANITY_SPEC_FLIP_N,
  type MetaSnapshotPayload,
} from '~/utils/metaTypes'

export type MetaRunVerdict = {
  status: 'ok' | 'partial'
  reasons: string[]
}

export function catalogSpecKeys(): string[] {
  return META_CLASSES.flatMap(cls => cls.specs.map(spec => `${cls.slug}/${spec.slug}`))
}

export function totalPlayers(payload: MetaSnapshotPayload): number {
  return payload.classes.reduce((sum, cls) => sum + cls.n, 0)
}

export function nBySpec(payload: MetaSnapshotPayload): Record<string, number> {
  const out: Record<string, number> = {}
  for (const cls of payload.classes) {
    for (const spec of cls.specs) out[`${cls.slug}/${spec.slug}`] = spec.n
  }
  return out
}

export function evaluateMetaRunPolicy(input: {
  plannedProfiles: number
  successfulProfiles: number
  stats: { calls: number, http429: number }
  payload: MetaSnapshotPayload
  previous: MetaSnapshotPayload | null
  /** Deadline partials may omit unfinished catalog specs; last-good still wins if gates fail. */
  requireCompleteCatalog?: boolean
}): MetaRunVerdict {
  const reasons: string[] = []
  if (input.plannedProfiles > 0) {
    const ratio = input.successfulProfiles / input.plannedProfiles
    if (ratio < META_MIN_PROFILE_SUCCESS_RATIO) {
      reasons.push(`profile success ${ratio.toFixed(3)} below ${META_MIN_PROFILE_SUCCESS_RATIO}`)
    }
  }
  if (input.stats.calls > 0) {
    const rate = input.stats.http429 / input.stats.calls
    if (rate > META_MAX_429_RATE) {
      reasons.push(`429 rate ${rate.toFixed(3)} above ${META_MAX_429_RATE}`)
    }
  }

  if (input.requireCompleteCatalog !== false) {
    const presentClasses = new Set(input.payload.classes.map(cls => cls.slug))
    for (const cls of META_CLASSES) {
      if (!presentClasses.has(cls.slug)) reasons.push(`missing class ${cls.slug}`)
    }
    const presentSpecs = new Set(catalogSpecKeys().map(key => key).filter((key) => {
      const [classSlug, specSlug] = key.split('/')
      return input.payload.classes.some(cls => cls.slug === classSlug && cls.specs.some(spec => spec.slug === specSlug))
    }))
    for (const key of catalogSpecKeys()) {
      if (!presentSpecs.has(key)) reasons.push(`missing spec ${key}`)
    }
  }

  if (input.previous) {
    const prevTotal = totalPlayers(input.previous)
    const nextTotal = totalPlayers(input.payload)
    if (prevTotal > 0 && nextTotal < prevTotal * META_SANITY_N_FLOOR_RATIO) {
      reasons.push(`total n dropped from ${prevTotal} to ${nextTotal}`)
    }
    const prevN = nBySpec(input.previous)
    const nextN = nBySpec(input.payload)
    for (const [key, count] of Object.entries(prevN)) {
      if (count >= META_SANITY_SPEC_FLIP_N && (nextN[key] ?? 0) === 0) {
        reasons.push(`spec ${key} flipped from n=${count} to 0`)
      }
    }
  }

  return { status: reasons.length ? 'partial' : 'ok', reasons }
}

export type MetaSnapshotCoverage = {
  specsWithData: number
  profiles: number
  wellCoveredSpecs: number
  wellCoveredProfiles: number
}

/** Coverage uses profileCount, not leaderboard n. Default well-covered is the UI show floor; last-good / rollback use META_MIN_BUILD_SAMPLE. */
export function metaSnapshotCoverage(
  payload: MetaSnapshotPayload | null | undefined,
  minProfileCount = META_MIN_SHOW_SAMPLE,
): MetaSnapshotCoverage {
  if (!payload) return { specsWithData: 0, profiles: 0, wellCoveredSpecs: 0, wellCoveredProfiles: 0 }
  let specsWithData = 0
  let profiles = 0
  let wellCoveredSpecs = 0
  let wellCoveredProfiles = 0
  for (const cls of payload.classes) {
    for (const spec of cls.specs) {
      const n = spec.profileCount ?? 0
      if (n > 0) {
        specsWithData += 1
        profiles += n
      }
      if (n >= minProfileCount) {
        wellCoveredSpecs += 1
        wellCoveredProfiles += n
      }
    }
  }
  return { specsWithData, profiles, wellCoveredSpecs, wellCoveredProfiles }
}

/**
 * Keep last-good when the incoming snapshot is thinner on well-covered specs
 * (or on profiles when neither side meets the per-spec minimum). A 40×1
 * deadline partial must not replace a 39×200 last-good.
 */
export function shouldKeepLastGoodMetaSnapshot(
  previous: MetaSnapshotPayload | null | undefined,
  incoming: MetaSnapshotPayload,
): boolean {
  const prev = metaSnapshotCoverage(previous, META_MIN_BUILD_SAMPLE)
  if (prev.specsWithData === 0 && prev.profiles === 0) return false
  const next = metaSnapshotCoverage(incoming, META_MIN_BUILD_SAMPLE)
  if (next.wellCoveredSpecs > prev.wellCoveredSpecs) return false
  if (next.wellCoveredSpecs === prev.wellCoveredSpecs) {
    if (next.wellCoveredSpecs > 0) {
      if (next.wellCoveredProfiles >= prev.wellCoveredProfiles) return false
      return true
    }
    if (next.profiles >= prev.profiles) return false
    return true
  }
  return true
}

export type MetaPartialOutcome = 'published' | 'kept-last-good' | 'not-published'

/** Drop specs below the build-sample floor so a first partial never publishes n < 50. */
export function omitThinMetaSpecs(
  payload: MetaSnapshotPayload,
  minProfileCount = META_MIN_BUILD_SAMPLE,
): MetaSnapshotPayload {
  const classes = payload.classes
    .map((cls) => {
      const specs = cls.specs.filter(spec => (spec.profileCount ?? 0) >= minProfileCount)
      return { ...cls, specs, n: specs.reduce((sum, spec) => sum + spec.n, 0) }
    })
    .filter(cls => cls.specs.length > 0)
  return { ...payload, classes }
}

export function markMetaSnapshotPartial(payload: MetaSnapshotPayload): MetaSnapshotPayload {
  if (payload.freshness.partial) return payload
  return { ...payload, freshness: { ...payload.freshness, partial: true } }
}

export function decideDeadlinePartialPublish(input: {
  payload: MetaSnapshotPayload
  previous: MetaSnapshotPayload | null
  plannedProfiles: number
  successfulProfiles: number
  stats: { calls: number, http429: number }
}): { outcome: MetaPartialOutcome, reasons: string[], payload: MetaSnapshotPayload } {
  const publishable = omitThinMetaSpecs(input.payload)
  const coverage = metaSnapshotCoverage(publishable, META_MIN_BUILD_SAMPLE)
  const policy = evaluateMetaRunPolicy({
    plannedProfiles: input.plannedProfiles,
    successfulProfiles: input.successfulProfiles,
    stats: input.stats,
    payload: publishable,
    previous: input.previous,
    requireCompleteCatalog: false,
  })
  const thinner = input.previous ? shouldKeepLastGoodMetaSnapshot(input.previous, publishable) : false
  if (coverage.wellCoveredSpecs === 0) {
    const raw = metaSnapshotCoverage(input.payload)
    const reasons = [raw.specsWithData === 0 ? 'no specs with data' : 'no specs at the build-sample floor']
    if (input.previous) {
      return { outcome: 'kept-last-good', reasons, payload: publishable }
    }
    return { outcome: 'not-published', reasons, payload: publishable }
  }
  if (input.previous && (thinner || policy.reasons.length)) {
    const reasons = [...policy.reasons]
    if (thinner) reasons.push('incoming coverage is thinner than last-good')
    return { outcome: 'kept-last-good', reasons, payload: publishable }
  }
  // No last-good has ever existed: a partial with real specs (each n >= 50)
  // may go live even when the 429-rate gate fails. Always mark deadline /
  // first-partial publishes so /meta can show "Partial data".
  return {
    outcome: 'published',
    reasons: policy.reasons,
    payload: markMetaSnapshotPartial(publishable),
  }
}

export function coverageIsBetterThan(candidate: MetaSnapshotCoverage, other: MetaSnapshotCoverage): boolean {
  if (candidate.wellCoveredSpecs !== other.wellCoveredSpecs) return candidate.wellCoveredSpecs > other.wellCoveredSpecs
  if (candidate.wellCoveredProfiles !== other.wellCoveredProfiles) return candidate.wellCoveredProfiles > other.wellCoveredProfiles
  if (candidate.specsWithData !== other.specsWithData) return candidate.specsWithData > other.specsWithData
  return candidate.profiles > other.profiles
}
