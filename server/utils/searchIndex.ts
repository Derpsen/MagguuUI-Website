/** Public search index (Guide, Changelog, FAQ, Strings). Pure builder, unit-tested. */
import { publicAnchorId } from '~/utils/publicAnchor'
import { plainTextPreview } from '~/utils/richText'

export interface SearchEntry {
  id: string
  group: 'Guide' | 'Changelog' | 'FAQ' | 'Strings'
  label: string
  /** Short preview shown under the label. */
  text: string
  /** Full plain text for full-text matching (Guide, Changelog, FAQ only). */
  body?: string
  to: string
}

/** Per-entry cap so one huge release cannot bloat the lazily loaded index. */
export const SEARCH_BODY_MAX = 6000

/**
 * Guide sections that are static in pages/guide.vue (not editable steps), so
 * they are not in the database. Keep in sync with the page copy.
 */
export const STATIC_GUIDE_SECTIONS = [
  {
    id: 'guide-apply-one-module',
    label: 'Apply only one module',
    text: 'Import a single profile instead of everything with Apply Magguu profiles.',
    body: 'Apply only one module. Apply Magguu profiles is the all-in-one first install and has no per-module selection. '
      + 'To take just one part open /mui, go to Setup and use the Required and Optional import buttons: Import EllesmereUI profile, Import class layouts, '
      + 'Import BigWigs profile, Import Northern Sky, Import EXBoss, Import Smart Reminders, Import Whisper Messenger. '
      + 'Apply Magguu Settings applies only the Magguu Settings. WaypointUI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack and Premade Groups Filter have no single import button. '
      + 'You can also copy a single string from Strings and paste it into the addon import window.',
    to: '/guide#apply-one-module',
  },
] as const

export interface SearchSources {
  guideSteps: Record<string, string>
  faqs: Array<{ id: number, question: string, answer: string }>
  /** Published `vX.Y.Z` releases, newest first. */
  changelog?: Array<{ version: string, content: string }>
  profiles: Array<{ id: number, addon: string, profile: string }>
  layouts: Array<{ id: number, className: string | null, spec: string | null, name?: string | null }>
  wowupPacks: string[]
}

const CHANGELOG_PLAIN = { stripChangelogDateHeaders: true } as const

function plainBody(source: string, options: { stripChangelogDateHeaders?: boolean } = {}): string {
  return plainTextPreview(source, 0, options).slice(0, SEARCH_BODY_MAX)
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
      body: plainBody(src.guideSteps[`step_${n}`] || ''),
      to: `/guide#step-${n}`,
    })
  }
  for (const section of STATIC_GUIDE_SECTIONS) {
    out.push({ id: section.id, group: 'Guide', label: section.label, text: section.text, body: section.body, to: section.to })
  }
  for (const release of src.changelog ?? []) {
    out.push({
      id: `changelog-${release.version}`,
      group: 'Changelog',
      label: `Changelog · ${release.version}`,
      text: plainTextPreview(release.content, 140, CHANGELOG_PLAIN),
      body: plainBody(release.content, CHANGELOG_PLAIN),
      to: `/changelog#${publicAnchorId('release', release.version)}`,
    })
  }
  for (const f of src.faqs) {
    out.push({ id: `faq-${f.id}`, group: 'FAQ', label: f.question, text: plainTextPreview(f.answer, 140), body: plainBody(f.answer), to: `/faq#${publicAnchorId('faq', f.question)}` })
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
