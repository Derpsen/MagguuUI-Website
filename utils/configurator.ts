/**
 * Profile configurator: selection → output logic (pure, shared by the page,
 * the API and the tests). Everything shown is derived from published data
 * (visible addons, visible profiles, visible WowUp packs). It never builds a
 * new WowUp string and never claims the addon can import selectively.
 */

import { displayAddonName } from '~/utils/addonChipMeta'

export type PackKey = 'starter' | 'optional'

export interface ConfiguratorProfile { id: number, name: string }

export interface ConfiguratorAddon {
  slug: string
  name: string
  category: 'required' | 'core' | 'optional'
  url: string | null
  /** The published WowUp pack that installs this addon, if any. */
  pack: PackKey | null
  /** True when MagguuUI's Setup page has a single-import button for it. */
  singleImport: boolean
  profiles: ConfiguratorProfile[]
}

export interface ConfiguratorPack {
  key: PackKey
  label: string
  /** WowUp row id; the string itself is fetched on copy. */
  id: number
  /** Addon names exactly as listed inside the pack (display form). */
  addons: string[]
}

export interface ConfiguratorData {
  addons: ConfiguratorAddon[]
  packs: ConfiguratorPack[]
}

/** The addon every setup needs; always part of the selection. */
export const REQUIRED_SLUG = 'ellesmereui'

/**
 * Addons with a single-import button in MagguuUI Setup (Required/Optional
 * lists). Verified against the addon source (MUE:BuildIndividualProfileOptions,
 * MagguuUI_EUI/Tools.lua) on 2026-10-24; InstallAll itself has no per-module
 * choice. Re-check when the addon's Setup page changes.
 */
export const SINGLE_IMPORT_SLUGS: ReadonlySet<string> = new Set([
  'ellesmereui',
  'bigwigs',
  'northern-sky-raid-tools',
  'exboss',
  'smart-reminders',
  'whisper-messenger',
])

/** Compare addon names from the catalogue with names inside a WowUp pack. */
export function normalizeAddonName(name: string): string {
  return displayAddonName(name).toLowerCase().replace(/\s+/g, ' ').trim()
}

export interface Selection {
  /** Selected addon slugs (always includes the required one). */
  addons: string[]
  /** Profiles switched off, as `slug:Profile name`. */
  exclude: string[]
}

type QueryValue = string | null | undefined | Array<string | null>
export type SelectionQuery = Record<string, QueryValue>

const first = (v: QueryValue): string => (Array.isArray(v) ? v[0] : v) ?? ''
const MAX_PARAM = 2000
/** The router percent-encodes query values itself; only the list separator and the escape char need escaping here. */
const escapeToken = (s: string): string => s.replace(/%/g, '%25').replace(/,/g, '%2C')

const split = (raw: string): string[] => raw.slice(0, MAX_PARAM).split(',').map((s) => {
  try { return decodeURIComponent(s).trim() } catch { return '' }
}).filter(Boolean)

/** Reads `?addons=a,b&exclude=a:Name` leniently: unknown slugs and profiles are dropped, duplicates removed. */
export function parseSelection(query: SelectionQuery, data: ConfiguratorData): Selection {
  const known = new Map(data.addons.map(a => [a.slug, a]))
  const slugs = new Set<string>()
  if (known.has(REQUIRED_SLUG)) slugs.add(REQUIRED_SLUG)
  for (const slug of split(first(query.addons))) if (known.has(slug)) slugs.add(slug)

  const exclude = new Set<string>()
  for (const token of split(first(query.exclude))) {
    const at = token.indexOf(':')
    if (at < 1) continue
    const slug = token.slice(0, at)
    const name = token.slice(at + 1)
    if (slugs.has(slug) && known.get(slug)!.profiles.some(p => p.name === name)) exclude.add(`${slug}:${name}`)
  }
  return { addons: [...slugs], exclude: [...exclude] }
}

/** Query for the URL. Parts that equal the default are left out, so a fresh page keeps a clean URL. */
export function selectionToQuery(sel: Selection, data: ConfiguratorData): Record<string, string> {
  const query: Record<string, string> = {}
  const extra = sel.addons.filter(s => s !== REQUIRED_SLUG)
  if (extra.length) query.addons = extra.map(escapeToken).join(',')
  const exclude = sel.exclude.filter((t) => {
    const slug = t.slice(0, t.indexOf(':'))
    return sel.addons.includes(slug) && data.addons.some(a => a.slug === slug)
  })
  if (exclude.length) query.exclude = exclude.map(escapeToken).join(',')
  return query
}

export function toggleAddon(sel: Selection, slug: string, on: boolean): Selection {
  if (slug === REQUIRED_SLUG) return sel
  const addons = on ? [...new Set([...sel.addons, slug])] : sel.addons.filter(s => s !== slug)
  return { addons, exclude: on ? sel.exclude : sel.exclude.filter(t => !t.startsWith(`${slug}:`)) }
}

export function toggleProfile(sel: Selection, slug: string, name: string, on: boolean): Selection {
  const token = `${slug}:${name}`
  const rest = sel.exclude.filter(t => t !== token)
  return { addons: sel.addons, exclude: on ? rest : [...rest, token] }
}

export function presetSelection(data: ConfiguratorData, preset: 'starter' | 'all' | 'required'): Selection {
  const slugs = data.addons
    .filter(a => preset === 'all' || a.slug === REQUIRED_SLUG || (preset === 'starter' && a.pack === 'starter'))
    .map(a => a.slug)
  return { addons: slugs, exclude: [] }
}

export interface ProfileOutput {
  addon: ConfiguratorAddon
  profiles: ConfiguratorProfile[]
}

export interface PackOutput {
  pack: ConfiguratorPack
  /** Selected addons this pack installs. */
  covers: string[]
  /** Everything else the pack installs (including addons that are not in the catalogue). */
  extras: string[]
}

export interface ConfiguratorOutput {
  selected: ConfiguratorAddon[]
  /** Plain addon list for "install by hand". */
  addonList: string[]
  packs: PackOutput[]
  /** Selected addons no published pack installs. */
  outsidePacks: string[]
  profiles: ProfileOutput[]
  /** Selected addons with a single-import button in Setup (and at least one chosen profile). */
  singleImport: string[]
  /** Selected addons with chosen profiles but no single-import button. */
  applyOnly: string[]
  /** Selected addons that have no Magguu profile at all. */
  noProfile: string[]
}

export function buildOutput(data: ConfiguratorData, sel: Selection): ConfiguratorOutput {
  const selected = data.addons.filter(a => sel.addons.includes(a.slug))
  const selectedNames = new Set(selected.map(a => normalizeAddonName(a.name)))

  const packs: PackOutput[] = []
  for (const pack of data.packs) {
    const covers = selected.filter(a => a.pack === pack.key).map(a => a.name)
    if (!covers.length) continue
    packs.push({ pack, covers, extras: pack.addons.filter(n => !selectedNames.has(normalizeAddonName(n))) })
  }

  const profiles: ProfileOutput[] = []
  for (const addon of selected) {
    const chosen = addon.profiles.filter(p => !sel.exclude.includes(`${addon.slug}:${p.name}`))
    if (chosen.length) profiles.push({ addon, profiles: chosen })
  }

  return {
    selected,
    addonList: selected.map(a => a.name),
    packs,
    outsidePacks: selected.filter(a => !a.pack).map(a => a.name),
    profiles,
    singleImport: profiles.filter(p => p.addon.singleImport).map(p => p.addon.name),
    applyOnly: profiles.filter(p => !p.addon.singleImport).map(p => p.addon.name),
    noProfile: selected.filter(a => !a.profiles.length).map(a => a.name),
  }
}
