/** Pure view helpers for the admin dashboard (unit-tested, no Vue, no server imports at runtime). */

import type { Overview } from '~/server/utils/adminOverview'

export interface AttentionItem {
  id: string
  text: string
  to: string
}

const DRAFT_ROUTES: Record<string, string> = { home: '/admin/content/home', guide: '/admin/content/guide' }

/** Things that need a human: drafts, unpublished notes, stale strings, a broken database. */
export function attentionItems(o: Overview): AttentionItem[] {
  const items: AttentionItem[] = []
  if (o.health.database !== 'ok') items.push({ id: 'database', text: 'Database check failed', to: '/admin/system/stats' })
  if (o.drafts.cells > 0) {
    const first = o.drafts.pages[0] || ''
    items.push({
      id: 'drafts',
      text: `${o.drafts.cells} unpublished draft ${o.drafts.cells === 1 ? 'field' : 'fields'} on ${o.drafts.pages.join(', ')}`,
      to: o.drafts.pages.length === 1 ? (DRAFT_ROUTES[first] || '/admin/content/pages') : '/admin/content',
    })
  }
  if (o.changelog.unpublished > 0) {
    items.push({
      id: 'changelog',
      text: `${o.changelog.unpublished} unpublished changelog ${o.changelog.unpublished === 1 ? 'entry' : 'entries'}`,
      to: '/admin/content/changelog',
    })
  }
  const stale = o.stale.profiles + o.stale.wowup + o.stale.layouts
  if (stale > 0) {
    items.push({ id: 'stale', text: `${stale} ${stale === 1 ? 'string' : 'strings'} not updated in ${o.stale.days} days`, to: '/admin/strings/profiles' })
  }
  return items
}

/** `+12%`, `-5%`, `0%` or `n/a` when last week had no baseline. */
export function formatTrend(current: number, previous: number): string {
  if (!previous) return 'n/a'
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes < 0) return 'unknown'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++ }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** `12 / 14 visible` or just the total when everything is visible. */
export function visibleOf(total: number, visible: number): string {
  return total === visible ? `${total}` : `${visible} / ${total} visible`
}
