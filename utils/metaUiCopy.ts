import type { MetaGearCount } from './metaTypes'

/**
 * Extra English strings and query helpers for the /meta UI.
 * Threshold and methodology copy stays in META_COPY.
 */

export const META_UI_COPY = {
  atAGlance: 'At a glance',
  topHeroTree: 'Top hero tree',
  topTrinkets: 'Top trinkets',
  loadoutCode: 'Talent loadout code',
  copyHint: 'Select the code and copy it, then import it in the in-game talent window.',
  copyFailed: 'Copy failed — select the code manually.',
  copiedStatus: 'Talent code copied to clipboard.',
  copiedVisible: 'Copied!',
  buildOf: (count: number) => `${count} in sample`,
  ofSample: (pct: string) => `${pct} of sampled characters`,
  heroTopBuild: 'Most used build in this hero tree',
  heatmapLegend: 'Cell shading = pick rate. Core ≥ 80%, flexible 20–79%, rare < 20%.',
  unmappedNode: 'Unmapped choice',
  noTalents: 'No talent data in this snapshot.',
  noGear: 'No gear data in this snapshot.',
  lowSample: 'low sample',
  specsShown: (count: number) => `${count} shown`,
  onThisPage: 'On this page',
  skipToContent: 'Skip to data',
  slotNames: {
    HEAD: 'Head', NECK: 'Neck', SHOULDER: 'Shoulders', BACK: 'Back', CHEST: 'Chest', WRIST: 'Wrists',
    HANDS: 'Hands', WAIST: 'Waist', LEGS: 'Legs', FEET: 'Feet', FINGER_1: 'Ring', FINGER_2: 'Ring',
    FINGER: 'Ring', TRINKET_1: 'Trinket', TRINKET_2: 'Trinket', TRINKET: 'Trinket',
    MAIN_HAND: 'Main hand', OFF_HAND: 'Off hand', RANGED: 'Ranged',
  } as Record<string, string>,
} as const

export type MetaIndexRole = 'all' | 'dps' | 'tank' | 'healer'
export type MetaIndexGroup = 'spec' | 'class'

/** Parse `?role=` / `?by=` so the index filter works as plain links without JS. */
export function parseMetaIndexQuery(query: Record<string, unknown>): { role: MetaIndexRole, by: MetaIndexGroup } {
  const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)
  const role = String(first(query.role) ?? '').toLowerCase()
  const by = String(first(query.by) ?? '').toLowerCase()
  return {
    role: role === 'dps' || role === 'tank' || role === 'healer' ? role : 'all',
    by: by === 'class' ? 'class' : 'spec',
  }
}

export const META_UI_COPY_KL = {
  heroCta: 'Choose your spec',
  statClasses: 'Classes',
  statSpecs: 'Specs',
  statSample: 'Characters sampled',
  statUpdated: 'Last update',
  scope: 'Scope',
  scopeMplus: 'Mythic+',
  pickClass: 'Pick a class',
  switchSpec: 'Switch spec',
  heroToggle: 'Hero tree',
  heroAll: 'All',
  ilvl: 'ilvl',
  sourceCrafted: 'Crafted',
  copiedVisible: 'Copied!',
} as const

/** Parse `?hero=<id>` on spec pages (hero-tree toggle as plain links). */
export function parseHeroQuery(query: Record<string, unknown>, validIds: number[]): number | null {
  const raw = Array.isArray(query.hero) ? query.hero[0] : query.hero
  const id = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(id) && validIds.includes(id) ? id : null
}

export type MetaGearCardItem = MetaGearCount
export type MetaGearCardSlot = { slot: string, items: MetaGearCardItem[] }

/** Snapshot `fetchedAt` is Unix seconds; accept ms too, like formatBerlinTime. */
export function metaFetchedAtMs(value: number): number {
  return value < 1e12 ? value * 1000 : value
}

const BLIZZARD_ICON_BASE = 'https://render.worldofwarcraft.com/icons/56'

/** Build a Blizzard render URL from a stored icon filename (no host). */
export function blizzardIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null
  const trimmed = icon.trim()
  if (!trimmed) return null
  if (/^https:\/\/render\.worldofwarcraft\.com\//i.test(trimmed)) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return null
  // Filenames only — reject path segments so e.g. ../etc/passwd cannot slip through.
  const file = trimmed.split('?')[0] || ''
  if (file.includes('/') || file.includes('\\') || file.includes('..')) return null
  const stem = file.replace(/\.(jpg|jpeg|png|webp)$/i, '')
  if (!/^[a-z0-9_-]+$/i.test(stem)) return null
  return `${BLIZZARD_ICON_BASE}/${stem}.jpg`
}

/**
 * Master ads switch (NUXT_ADS / runtimeConfig.public.ads). Default off.
 * Recognised on-values match the other kill switches: on/true/1/yes.
 */
export function isNuxtAdsEnabled(raw: unknown): boolean {
  const value = String(raw ?? '').trim().toLowerCase()
  return value === 'on' || value === 'true' || value === '1' || value === 'yes'
}
