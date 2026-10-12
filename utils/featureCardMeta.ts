import { addonIconForName } from './addonIcons'
import { displayAddonName, emojiForAddonName } from './addonChipMeta'

export type FeatureAccent = 'gold' | 'sky' | 'violet'

export interface FeatureCardMeta {
  icon: string
  accent: FeatureAccent
}

/** Visual meta for the three home "The module" cards (by position). */
export const FEATURE_CARD_META: FeatureCardMeta[] = [
  { icon: 'i-heroicons-cog-6-tooth', accent: 'gold' },
  { icon: 'i-heroicons-squares-2x2', accent: 'sky' },
  { icon: 'i-heroicons-sparkles', accent: 'violet' },
]

export function featureCardMeta(index: number): FeatureCardMeta {
  return FEATURE_CARD_META[index % FEATURE_CARD_META.length]!
}

/** Unique `/mui …` slash commands found in <code> tags, in order. */
export function extractMuiCommands(html: string): string[] {
  const out: string[] = []
  for (const m of (html || '').matchAll(/<code>\s*(\/mui(?:\s+[\w-]+)*)\s*<\/code>/gi)) {
    const cmd = m[1]!.replace(/\s+/g, ' ').trim()
    if (!out.includes(cmd)) out.push(cmd)
  }
  return out
}

export interface FeatureAddonChip {
  name: string
  icon?: string
  emoji: string
}

/** 48px WebP thumbnail of a public/addon-icons logo (public/addon-icons/thumb). */
export function addonThumbPath(path: string | undefined): string | undefined {
  return path?.replace(/^\/addon-icons\/([^/]+)\.(png|jpe?g)$/i, '/addon-icons/thumb/$1.webp')
}

function toChip(name: string): FeatureAddonChip {
  return { name, icon: addonThumbPath(addonIconForName(name)), emoji: emojiForAddonName(displayAddonName(name)) }
}

function splitNames(list: string): string[] {
  return list
    .split(/,\s*(?:and\s+)?|\s+and\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function isKnownAddon(name: string): boolean {
  return addonIconForName(name) !== undefined
}

/**
 * Split addon names out of a feature's HTML so they can render as chips.
 * - A `<li>` made only of known addon names moves into chips (removed from the list).
 * - An "… profiles for A, B, and C." sentence stays in the copy and also yields chips.
 * Names are kept exactly as written (third-party names untouched).
 */
export function splitFeatureAddons(html: string): { html: string, addons: FeatureAddonChip[] } {
  const src = html || ''
  const addons: FeatureAddonChip[] = []
  const push = (name: string) => {
    if (!addons.some(a => a.name === name)) addons.push(toChip(name))
  }
  const out = src.replace(/<li>([^<]*)<\/li>/gi, (whole, inner: string) => {
    const names = splitNames(inner.trim())
    if (names.length < 2 || !names.every(isKnownAddon)) return whole
    names.forEach(push)
    return ''
  })
  if (!addons.length) {
    const m = src.replace(/<[^>]+>/g, '').match(/profiles for ([^.]+)\./i)
    if (m?.[1]) splitNames(m[1]).forEach(push)
  }
  return { html: out, addons }
}

export function extractAddonChips(html: string): FeatureAddonChip[] {
  return splitFeatureAddons(html).addons
}
