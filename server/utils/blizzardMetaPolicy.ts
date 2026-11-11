/**
 * Sanity gates before a staged Meta snapshot is promoted to the active pointer.
 */

import { META_CLASSES } from '~/utils/metaCatalog'
import {
  META_MAX_429_RATE,
  META_MIN_PROFILE_SUCCESS_RATIO,
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
