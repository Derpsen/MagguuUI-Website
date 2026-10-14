/** Public search index (Guide, FAQ, Strings). Pure builder, unit-tested. */
import { publicAnchorId } from '~/utils/publicAnchor'
import { plainTextPreview } from '~/utils/richText'

export interface SearchEntry {
  id: string
  group: 'Guide' | 'FAQ' | 'Strings'
  label: string
  text: string
  to: string
}

export interface SearchSources {
  guideSteps: Record<string, string>
  faqs: Array<{ id: number, question: string, answer: string }>
  profiles: Array<{ id: number, addon: string, profile: string }>
  layouts: Array<{ id: number, className: string | null, spec: string | null, name?: string | null }>
  wowupPacks: string[]
}

export function buildSearchIndex(src: SearchSources): SearchEntry[] {
  const out: SearchEntry[] = []
  const stepNumbers = Object.keys(src.guideSteps)
    .map(k => /^step_(\d+)_title$/.exec(k)?.[1])
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => Number(a) - Number(b))
  for (const n of stepNumbers) {
    out.push({
      id: `guide-${n}`,
      group: 'Guide',
      label: src.guideSteps[`step_${n}_title`] || `Step ${n}`,
      text: plainTextPreview(src.guideSteps[`step_${n}`] || '', 140),
      to: `/guide#step-${n}`,
    })
  }
  for (const f of src.faqs) {
    out.push({ id: `faq-${f.id}`, group: 'FAQ', label: f.question, text: plainTextPreview(f.answer, 140), to: `/faq#${publicAnchorId('faq', f.question)}` })
  }
  for (const p of src.profiles) {
    out.push({
      id: `profile-${p.id}`,
      group: 'Strings',
      label: `${p.addon} · ${p.profile}`,
      text: 'Addon profile import string',
      to: `/strings?tab=profiles&addon=${encodeURIComponent(p.addon)}&profile=${p.id}`,
    })
  }
  for (const l of src.layouts) {
    if (!l.className) continue
    const query = new URLSearchParams({ class: l.className, ...(l.spec ? { spec: l.spec } : {}) })
    out.push({
      id: `layout-${l.id}`,
      group: 'Strings',
      label: [l.className, l.spec].filter(Boolean).join(' · '),
      text: 'Cooldown Viewer layout',
      to: `/strings?${query.toString()}`,
    })
  }
  for (const name of src.wowupPacks) {
    out.push({ id: `wowup-${name}`, group: 'Strings', label: `WowUp · ${name}`, text: 'WowUp import string', to: `/strings?tab=wowup&pack=${encodeURIComponent(name)}` })
  }
  return out
}
