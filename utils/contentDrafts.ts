/** Client-side helpers for content drafts (pure, shared by the admin editors). */
export interface DraftItem {
  page: string
  section: string
  key: string
  value: string
  locale?: string
  type?: string
}

export type ContentTree = Record<string, Record<string, Record<string, string>>>

const cell = (i: { page: string, section: string, key: string, locale?: string }) =>
  `${i.page}\u0000${i.section}\u0000${i.key}\u0000${i.locale || 'en'}`

/** Map of the values a form would publish right now (page/section/key/locale → value). */
export function publishedMap(items: DraftItem[]): Map<string, string> {
  return new Map(items.map(i => [cell(i), i.value]))
}

/** Only the cells whose value differs from the published value make up the draft. */
export function changedItems(items: DraftItem[], published: Map<string, string>): DraftItem[] {
  return items.filter(i => i.value.trim() !== (published.get(cell(i)) ?? '').trim())
}

/**
 * Overlay draft cells onto a `locale → section → key → value` tree (as returned
 * by GET /admin/content/:page). An empty draft value removes the cell, which is
 * what Publish does too, so the editor shows the default text.
 */
export function overlayDrafts(tree: ContentTree | null | undefined, page: string, drafts: DraftItem[]): ContentTree {
  const out: ContentTree = JSON.parse(JSON.stringify(tree || {}))
  for (const d of drafts) {
    if (d.page !== page) continue
    const locale = d.locale || 'en'
    const byLocale = out[locale] ?? (out[locale] = {})
    const bySection = byLocale[d.section] ?? (byLocale[d.section] = {})
    if (d.value === '') Reflect.deleteProperty(bySection, d.key)
    else bySection[d.key] = d.value
  }
  return out
}
