export type StringsTab = 'layouts' | 'profiles' | 'wowup'

export interface StringsLinkState {
  tab: StringsTab
  className: string
  spec: string
  addon: string
  profileId: string
  pack: string
}

export function queryText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function initialStringsTab(query: Record<string, unknown>): StringsTab {
  const tab = queryText(query.tab)
  if (tab === 'layouts' || tab === 'profiles' || tab === 'wowup') return tab
  if (queryText(query.addon) || queryText(query.profile)) return 'profiles'
  if (queryText(query.pack)) return 'wowup'
  return 'layouts'
}

/** Public /strings query. Layouts stay on the bare path; profile and pack stay on their tab. */
export function queryFromStringsState(state: StringsLinkState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.tab === 'profiles') {
    query.tab = 'profiles'
    if (state.addon) query.addon = state.addon
    if (state.profileId) query.profile = state.profileId
    return query
  }
  if (state.tab === 'wowup') {
    query.tab = 'wowup'
    if (state.pack) query.pack = state.pack
    return query
  }
  if (state.className) query.class = state.className
  if (state.spec) query.spec = state.spec
  return query
}
