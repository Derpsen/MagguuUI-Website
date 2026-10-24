/**
 * Pure logic for the admin Ctrl/Cmd+K command palette (layouts/admin.vue only).
 * Items are either pages (navigate to a route) or safe actions (theme, logout).
 * Filtering: every query word must occur (case-insensitive) in the label, group,
 * description or extra keywords; label hits rank above the rest. No dependencies.
 */

export type AdminCommandAction = 'toggle-theme' | 'logout'

export interface PaletteItem {
  id: string
  group: string
  label: string
  description: string
  icon: string
  /** Route to open. Omitted for actions. */
  to?: string
  /** Built-in action to run instead of navigating. */
  action?: AdminCommandAction
  keywords?: string
}

export interface PaletteGroup<T extends PaletteItem = PaletteItem> {
  label: string
  items: Array<T & { index: number }>
}

const MAX_TOKENS = 6

/** The two built-in actions that are not page links. Theme label follows the current mode. */
export function builtInActions(isDark: boolean): PaletteItem[] {
  return [
    {
      id: 'action:toggle-theme',
      group: 'Actions',
      label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      description: 'Toggle the colour theme.',
      icon: isDark ? 'i-heroicons-sun' : 'i-heroicons-moon',
      action: 'toggle-theme',
      keywords: 'theme appearance colour color dark light mode',
    },
    {
      id: 'action:logout',
      group: 'Actions',
      label: 'Log out',
      description: 'End this admin session.',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      action: 'logout',
      keywords: 'logout sign out session',
    },
  ]
}

function tokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS)
}

function scoreItem(item: PaletteItem, words: string[]): number {
  const label = item.label.toLowerCase()
  const rest = `${item.group} ${item.description} ${item.keywords ?? ''}`.toLowerCase()
  let score = 0
  for (const word of words) {
    if (label.startsWith(word)) score += 4
    else if (label.split(/[\s›:/-]+/).some(part => part.startsWith(word))) score += 3
    else if (label.includes(word)) score += 2
    else if (rest.includes(word)) score += 1
    else return -1
  }
  return score
}

/** Empty query keeps the original order. Otherwise best score first, original order on ties. */
export function filterCommands<T extends PaletteItem>(items: T[], query: string): T[] {
  const words = tokens(query)
  if (!words.length) return items
  return items
    .map((item, order) => ({ item, order, score: scoreItem(item, words) }))
    .filter(entry => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(entry => entry.item)
}

/** Groups in order of first appearance; each item carries its flat index for keyboard navigation. */
export function groupCommands<T extends PaletteItem>(items: T[]): PaletteGroup<T>[] {
  const groups = new Map<string, PaletteGroup<T>>()
  items.forEach((item, index) => {
    let group = groups.get(item.group)
    if (!group) {
      group = { label: item.group, items: [] }
      groups.set(item.group, group)
    }
    group.items.push({ ...item, index })
  })
  return [...groups.values()]
}

/** Next active index for arrow/Home/End keys; wraps around. -1 when the list is empty. */
export function moveActive(current: number, count: number, key: 'down' | 'up' | 'home' | 'end'): number {
  if (count <= 0) return -1
  if (key === 'home') return 0
  if (key === 'end') return count - 1
  if (key === 'down') return current >= count - 1 ? 0 : current + 1
  return current <= 0 ? count - 1 : current - 1
}
