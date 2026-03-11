export interface AdminNavLink {
  to: string
  label: string
  icon: string
  description: string
}

export interface AdminNavSection {
  title: string
  links: AdminNavLink[]
}

export interface AdminContextItem extends AdminNavLink {
  section: string
  hint: string
}

export interface AdminCommandItem extends AdminNavLink {
  group: string
}

const dashboardContext: AdminContextItem = {
  to: '/admin',
  label: 'Dashboard',
  icon: 'i-heroicons-squares-2x2',
  description: 'Operational overview, publishing activity and site health.',
  section: 'Overview',
  hint: 'Track site health, publishing activity and operational status.',
}

const adminSections: AdminNavSection[] = [
  {
    title: 'Content',
    links: [
      { to: '/admin/content/home', label: 'Homepage', icon: 'i-heroicons-home-modern', description: 'Landing page copy, features and hero messaging.' },
      { to: '/admin/content/guide', label: 'Guide', icon: 'i-heroicons-book-open', description: 'Onboarding, install steps and walkthrough content.' },
      { to: '/admin/content/faq', label: 'FAQ', icon: 'i-heroicons-question-mark-circle', description: 'Support answers and recurring user questions.' },
      { to: '/admin/content/changelog', label: 'Changelog', icon: 'i-heroicons-document-text', description: 'Release notes and public update history.' },
    ],
  },
  {
    title: 'Data',
    links: [
      { to: '/admin/strings/profiles', label: 'Addon Profiles', icon: 'i-heroicons-cube', description: 'Addon import strings, sort order and visibility.' },
      { to: '/admin/strings/wowup', label: 'WowUp Strings', icon: 'i-heroicons-arrow-down-tray', description: 'Package strings for WowUp distribution.' },
      { to: '/admin/strings/layouts', label: 'Character Layouts', icon: 'i-heroicons-user-circle', description: 'Class and specialization layout imports.' },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/admin/system/settings', label: 'Settings', icon: 'i-heroicons-cog-6-tooth', description: 'Site-wide configuration, tracking and maintenance.' },
      { to: '/admin/system/stats', label: 'Analytics', icon: 'i-heroicons-chart-bar', description: 'Traffic, copies and API usage analytics.' },
      { to: '/admin/system/users', label: 'Users', icon: 'i-heroicons-users', description: 'Accounts, passkeys, sessions and access controls.' },
      { to: '/admin/system/api-keys', label: 'API Keys', icon: 'i-heroicons-key', description: 'Secure integration keys and access management.' },
      { to: '/admin/system/github', label: 'GitHub Sync', icon: 'i-simple-icons-github', description: 'Repository sync, imports, exports and webhooks.' },
      { to: '/admin/system/activity', label: 'Activity Log', icon: 'i-heroicons-clock', description: 'Audit trail of administrative activity.' },
      { to: '/admin/system/fields', label: 'Custom Fields', icon: 'i-heroicons-adjustments-horizontal', description: 'Configurable fields and metadata.' },
    ],
  },
]

const contextOverrides: Record<string, { section: string; hint: string }> = {
  '/admin/content/home': { section: 'Content', hint: 'Update hero messaging, feature highlights and landing-page content.' },
  '/admin/content/guide': { section: 'Content', hint: 'Maintain the onboarding flow and installation instructions.' },
  '/admin/content/faq': { section: 'Content', hint: 'Keep support answers tidy and easy to scan.' },
  '/admin/content/changelog': { section: 'Content', hint: 'Publish updates with a clean version history and release notes.' },
  '/admin/strings/profiles': { section: 'Data', hint: 'Manage addon import strings, naming and sort order.' },
  '/admin/strings/wowup': { section: 'Data', hint: 'Maintain download package strings and release bundles.' },
  '/admin/strings/layouts': { section: 'Data', hint: 'Curate per-class and per-spec layout imports.' },
  '/admin/system/settings': { section: 'System', hint: 'Configure site-wide behaviour, links and operational toggles.' },
  '/admin/system/stats': { section: 'System', hint: 'Review usage, traffic and recent trends.' },
  '/admin/system/users': { section: 'System', hint: 'Control access, authentication methods and team accounts.' },
  '/admin/system/api-keys': { section: 'System', hint: 'Manage secure integration keys and external access.' },
  '/admin/system/github': { section: 'System', hint: 'Monitor repository connectivity and sync tooling.' },
  '/admin/system/activity': { section: 'System', hint: 'Audit changes and recent administrative actions.' },
  '/admin/system/fields': { section: 'System', hint: 'Maintain custom fields and internal metadata.' },
}

const contextItems: AdminContextItem[] = [
  dashboardContext,
  ...adminSections.flatMap(section =>
    section.links.map(link => ({
      ...link,
      section: contextOverrides[link.to]?.section || section.title,
      hint: contextOverrides[link.to]?.hint || link.description,
    })),
  ),
]

const dockLinks: AdminNavLink[] = [
  dashboardContext,
  adminSections[0].links[0],
  adminSections[1].links[0],
  adminSections[2].links[0],
]

const commandActions: AdminCommandItem[] = [
  { group: 'Actions', to: '/admin/strings/profiles?action=create', label: 'New Addon Profile', icon: 'i-heroicons-plus', description: 'Create a new addon import string.' },
  { group: 'Actions', to: '/admin/content/changelog?action=create', label: 'New Changelog Entry', icon: 'i-heroicons-plus', description: 'Document the latest release.' },
  { group: 'Actions', to: '/admin/strings/wowup?action=create', label: 'New WowUp String', icon: 'i-heroicons-plus', description: 'Add a new WowUp package string.' },
  { group: 'Other', to: '/', label: 'View Website', icon: 'i-heroicons-arrow-top-right-on-square', description: 'Open the public website.' },
]

export function isAdminPathActive(currentPath: string, targetPath: string, exact = false): boolean {
  if (targetPath === '/admin') return currentPath === '/admin'
  if (exact) return currentPath === targetPath
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}

export function useAdminNavigation() {
  const route = useRoute()

  const currentContext = computed(() =>
    contextItems.find(item => isAdminPathActive(route.path, item.to, item.to === '/admin')) || dashboardContext,
  )

  const commandItems = computed<AdminCommandItem[]>(() => [
    { group: 'Overview', ...dashboardContext },
    ...adminSections.flatMap(section =>
      section.links.map(link => ({
        ...link,
        group: section.title,
      })),
    ),
    ...commandActions,
  ])

  return {
    sections: adminSections,
    contextItems,
    currentContext,
    dockLinks,
    commandItems,
  }
}
