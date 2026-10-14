/** Field-level diff of admin content forms (page → section → key → value). */
export type ContentForm = Record<string, Record<string, string>>

export interface ContentChange {
  section: string
  key: string
  before: string
  after: string
}

export function diffContentForms(before: ContentForm, after: ContentForm): ContentChange[] {
  const out: ContentChange[] = []
  const sections = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const section of sections) {
    const keys = new Set([...Object.keys(before[section] || {}), ...Object.keys(after[section] || {})])
    for (const key of keys) {
      const a = before[section]?.[key] ?? ''
      const b = after[section]?.[key] ?? ''
      if (a.trim() !== b.trim()) out.push({ section, key, before: a, after: b })
    }
  }
  return out
}
