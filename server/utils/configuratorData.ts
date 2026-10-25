/**
 * Public data for the profile configurator. Visible and available addons,
 * visible profiles and visible WowUp packs only; no import strings (those are
 * fetched one at a time on copy, like the Import Strings page).
 */

import { SINGLE_IMPORT_SLUGS, normalizeAddonName, type ConfiguratorData, type PackKey } from '~/utils/configurator'
import { PROFILE_KEY_BY_SLUG, displayAddonName, wowupLabel } from '~/utils/addonChipMeta'
import { compareProfileNames } from '~/utils/profileLabels'

export interface ConfiguratorAddonRow {
  slug: string
  name: string
  category: string
  url: string | null
  sortOrder: number
}

export interface ConfiguratorPackRow {
  id: number
  addonNames: string[]
}

/** Storage keys of the two published collections; anything else on the WowUp tab is not a Magguu collection. */
const PACK_STORAGE_KEYS: Record<string, PackKey> = { Required: 'starter', Optional: 'optional' }

export function buildConfiguratorData(
  addonRows: ConfiguratorAddonRow[],
  profilesByKey: Record<string, Array<{ id: number, profile: string }>>,
  packsByName: Record<string, ConfiguratorPackRow>,
): ConfiguratorData {
  const packs: ConfiguratorData['packs'] = []
  const membership = new Map<string, PackKey>()
  for (const [storage, key] of Object.entries(PACK_STORAGE_KEYS)) {
    const row = packsByName[storage]
    if (!row) continue
    const names = row.addonNames.map(displayAddonName)
    packs.push({ key, label: wowupLabel(storage), id: row.id, addons: names })
    for (const n of names) if (!membership.has(normalizeAddonName(n))) membership.set(normalizeAddonName(n), key)
  }

  const order = ['required', 'core', 'optional']
  const addons = [...addonRows]
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((a) => {
      const key = PROFILE_KEY_BY_SLUG[a.slug]
      const list = (key ? profilesByKey[key] : undefined) ?? []
      const seen = new Set<string>()
      const profiles = list
        .filter(p => !seen.has(p.profile) && seen.add(p.profile))
        .map(p => ({ id: p.id, name: p.profile }))
        .sort((x, y) => compareProfileNames(x.name, y.name))
      return {
        slug: a.slug,
        name: a.name,
        category: (order.includes(a.category) ? a.category : 'optional') as 'required' | 'core' | 'optional',
        url: a.url,
        pack: membership.get(normalizeAddonName(a.name)) ?? null,
        singleImport: SINGLE_IMPORT_SLUGS.has(a.slug),
        profiles,
      }
    })

  return { addons, packs }
}
