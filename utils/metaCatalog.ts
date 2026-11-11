/**
 * Class / spec slugs and outbound links for Meta pages.
 * Our paths stay under /meta and never include product trademarks.
 * murlok.io and Archon URLs are outbound only — we do not scrape them.
 */

import { WOW_CLASS_SPECS } from './wowSpecs'

export type MetaClassEntry = {
  name: string
  slug: string
  specs: readonly MetaSpecEntry[]
}

export type MetaSpecEntry = {
  name: string
  slug: string
}

/** Blizzard playable-specialization IDs used to aggregate leaderboard entries. */
export const BLIZZARD_SPEC_BY_ID: Readonly<Record<number, { className: string, specName: string }>> = {
  250: { className: 'Death Knight', specName: 'Blood' },
  251: { className: 'Death Knight', specName: 'Frost' },
  252: { className: 'Death Knight', specName: 'Unholy' },
  577: { className: 'Demon Hunter', specName: 'Havoc' },
  581: { className: 'Demon Hunter', specName: 'Vengeance' },
  1480: { className: 'Demon Hunter', specName: 'Devourer' },
  102: { className: 'Druid', specName: 'Balance' },
  103: { className: 'Druid', specName: 'Feral' },
  104: { className: 'Druid', specName: 'Guardian' },
  105: { className: 'Druid', specName: 'Restoration' },
  1467: { className: 'Evoker', specName: 'Devastation' },
  1468: { className: 'Evoker', specName: 'Preservation' },
  1473: { className: 'Evoker', specName: 'Augmentation' },
  253: { className: 'Hunter', specName: 'Beast Mastery' },
  254: { className: 'Hunter', specName: 'Marksmanship' },
  255: { className: 'Hunter', specName: 'Survival' },
  62: { className: 'Mage', specName: 'Arcane' },
  63: { className: 'Mage', specName: 'Fire' },
  64: { className: 'Mage', specName: 'Frost' },
  268: { className: 'Monk', specName: 'Brewmaster' },
  270: { className: 'Monk', specName: 'Mistweaver' },
  269: { className: 'Monk', specName: 'Windwalker' },
  65: { className: 'Paladin', specName: 'Holy' },
  66: { className: 'Paladin', specName: 'Protection' },
  70: { className: 'Paladin', specName: 'Retribution' },
  256: { className: 'Priest', specName: 'Discipline' },
  257: { className: 'Priest', specName: 'Holy' },
  258: { className: 'Priest', specName: 'Shadow' },
  259: { className: 'Rogue', specName: 'Assassination' },
  260: { className: 'Rogue', specName: 'Outlaw' },
  261: { className: 'Rogue', specName: 'Subtlety' },
  262: { className: 'Shaman', specName: 'Elemental' },
  263: { className: 'Shaman', specName: 'Enhancement' },
  264: { className: 'Shaman', specName: 'Restoration' },
  265: { className: 'Warlock', specName: 'Affliction' },
  266: { className: 'Warlock', specName: 'Demonology' },
  267: { className: 'Warlock', specName: 'Destruction' },
  71: { className: 'Warrior', specName: 'Arms' },
  72: { className: 'Warrior', specName: 'Fury' },
  73: { className: 'Warrior', specName: 'Protection' },
}

export function toMetaSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const META_CLASSES: readonly MetaClassEntry[] = Object.entries(WOW_CLASS_SPECS).map(([name, specs]) => ({
  name,
  slug: toMetaSlug(name),
  specs: specs.map(specName => ({ name: specName, slug: toMetaSlug(specName) })),
}))

const CLASS_BY_SLUG = new Map(META_CLASSES.map(entry => [entry.slug, entry]))

export function findMetaClass(slug: string): MetaClassEntry | null {
  return CLASS_BY_SLUG.get(slug) ?? null
}

export function findMetaSpec(classSlug: string, specSlug: string): { classEntry: MetaClassEntry, spec: MetaSpecEntry } | null {
  const classEntry = findMetaClass(classSlug)
  if (!classEntry) return null
  const spec = classEntry.specs.find(item => item.slug === specSlug)
  return spec ? { classEntry, spec } : null
}

export function lookupBlizzardSpec(id: number, fallbackName?: string, fallbackClass?: string): { className: string, specName: string } | null {
  const known = BLIZZARD_SPEC_BY_ID[id]
  if (known) return known
  if (fallbackClass && fallbackName) return { className: fallbackClass, specName: fallbackName }
  return null
}

export function metaClassPath(classSlug: string): string {
  return `/meta/${classSlug}`
}

export function metaSpecPath(classSlug: string, specSlug: string): string {
  return `/meta/${classSlug}/${specSlug}`
}

/** Outbound only. We never fetch these URLs from the server. */
export function murlokClassUrl(classSlug: string): string {
  return `https://murlok.io/${classSlug}`
}

export function murlokSpecUrl(classSlug: string, specSlug: string): string {
  return `https://murlok.io/${classSlug}/${specSlug}`
}

export function archonClassUrl(classSlug: string): string {
  return `https://www.archon.gg/wow/builds/${classSlug}/mythic-plus`
}

export function archonSpecUrl(classSlug: string, specSlug: string): string {
  return `https://www.archon.gg/wow/builds/${classSlug}/${specSlug}/mythic-plus`
}


export type MetaRole = 'dps' | 'tank' | 'healer'

const TANK_SPECS = new Set([
  'death-knight/blood',
  'demon-hunter/vengeance',
  'druid/guardian',
  'monk/brewmaster',
  'paladin/protection',
  'warrior/protection',
])

const HEALER_SPECS = new Set([
  'druid/restoration',
  'evoker/preservation',
  'monk/mistweaver',
  'paladin/holy',
  'priest/discipline',
  'priest/holy',
  'shaman/restoration',
])

export function metaSpecRole(classSlug: string, specSlug: string): MetaRole {
  const key = `${classSlug}/${specSlug}`
  if (TANK_SPECS.has(key)) return 'tank'
  if (HEALER_SPECS.has(key)) return 'healer'
  return 'dps'
}

/** Official class colors (hex). Use `metaClassTextColor` for contrast-safe text. */
export const META_CLASS_COLORS: Readonly<Record<string, string>> = {
  'death-knight': '#c41e3a',
  'demon-hunter': '#a330c9',
  'druid': '#ff7c0a',
  'evoker': '#33937f',
  'hunter': '#aad372',
  'mage': '#3fc7eb',
  'monk': '#00ff98',
  'paladin': '#f48cba',
  'priest': '#ffffff',
  'rogue': '#fff468',
  'shaman': '#0070dd',
  'warlock': '#8788ee',
  'warrior': '#c69b6d',
}

export const META_QUALITY_COLORS: Readonly<Record<string, string>> = {
  poor: '#9d9d9d',
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
  artifact: '#e6cc80',
  heirloom: '#00ccff',
}

function hexLuminance(hex: string): number {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return 0
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function darkenHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return hex
  const ch = (i: number) => Math.max(0, Math.round(Number.parseInt(raw.slice(i, i + 2), 16) * factor)).toString(16).padStart(2, '0')
  return `#${ch(0)}${ch(2)}${ch(4)}`
}

/** Contrast-safe text color derived from an official class/quality hex. */
export function contrastSafeColor(hex: string, dark: boolean): string {
  const lum = hexLuminance(hex)
  if (!dark && lum >= 0.45) return darkenHex(hex, lum >= 0.8 ? 0.42 : 0.62)
  if (dark && lum < 0.18) return '#d4d4d8'
  return hex
}

export function metaClassColor(slug: string): string {
  return META_CLASS_COLORS[slug] ?? '#888888'
}

export function metaClassTextColor(slug: string, dark: boolean): string {
  return contrastSafeColor(metaClassColor(slug), dark)
}

export function metaQualityColor(quality: string | null | undefined, dark: boolean): string {
  const key = (quality || '').trim().toLowerCase()
  const hex = META_QUALITY_COLORS[key]
  if (!hex) return dark ? '#e5e7eb' : '#111827'
  return contrastSafeColor(hex, dark)
}

export function wowheadItemUrl(itemId: number): string {
  return `https://www.wowhead.com/item=${itemId}`
}

export function wowheadSpellUrl(spellId: number): string {
  return `https://www.wowhead.com/spell=${spellId}`
}

/** Outbound only. The path is Icy Veins' own URL (it may contain "wow"). */
export function icyVeinsGuideUrl(classSlug: string, specSlug: string): string {
  const role = metaSpecRole(classSlug, specSlug)
  return `https://www.icy-veins.com/wow/${specSlug}-${classSlug}-pve-${role}-guide`
}

export const META_MURLLOK_HOME = 'https://murlok.io/'
export const META_ARCHON_HOME = 'https://www.archon.gg/wow/mythic-plus'
