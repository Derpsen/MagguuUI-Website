export interface AdminNavLink {
  to: string
  label: string
  heading?: string
  icon: string
  description: string
  hint?: string
  children?: AdminNavLink[]
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
  heading: 'Dashboard',
  icon: 'i-heroicons-squares-2x2',
  description: 'Operational overview, publishing activity and site health.',
  section: 'Overview',
  hint: 'One primary action, the current signals and the latest activity.',
}

const adminSections: AdminNavSection[] = [
  {
    title: 'Content',
    links: [
      {
        to: '/admin/content/home',
        label: 'Home',
        heading: 'Homepage',
        icon: 'i-heroicons-home-modern',
        description: 'Landing page copy, features and hero messaging.',
        hint: 'Keep the landing page concise: hero, section labels and three feature cards.',
      },
      {
        to: '/admin/content/guide',
        label: 'Guide',
        heading: 'Guide',
        icon: 'i-heroicons-book-open',
        description: 'Onboarding, install steps and walkthrough content.',
        hint: 'Keep onboarding linear: one intro and a short set of clear steps.',
      },
      {
        to: '/admin/content/faq',
        label: 'FAQ',
        heading: 'FAQ',
        icon: 'i-heroicons-question-mark-circle',
        description: 'Support answers and recurring user questions.',
        hint: 'Keep support answers short, grouped and easy to scan.',
      },
      {
        to: '/admin/content/changelog',
        label: 'Updates',
        heading: 'Changelog',
        icon: 'i-heroicons-document-text',
        description: 'Release notes and public update history.',
        hint: 'Publish release notes, keep drafts tidy and archive older updates without noise.',
      },
    ],
  },
  {
    title: 'Data',
    links: [
      {
        to: '/admin/strings/profiles',
        label: 'Profiles',
        heading: 'Addon Profiles',
        icon: 'i-heroicons-cube',
        description: 'Addon import strings, sort order and visibility.',
        hint: 'Manage addon import strings, visibility states and ordering from one clean inventory.',
      },
      {
        to: '/admin/strings/wowup',
        label: 'WowUp',
        heading: 'WowUp Strings',
        icon: 'i-heroicons-arrow-down-tray',
        description: 'Package strings for WowUp distribution.',
        hint: 'Keep package strings ordered, visible and ready for one-click addon installation.',
      },
      {
        to: '/admin/strings/layouts',
        label: 'Layouts',
        heading: 'Character Layouts',
        icon: 'i-heroicons-user-circle',
        description: 'Class and specialization layout imports.',
        hint: 'Organize class and specialization layouts with clearer metadata, visibility states and sorting.',
      },
      {
        to: '/admin/data/addons',
        label: 'Addons',
        heading: 'Addon Catalogue',
        icon: 'i-heroicons-puzzle-piece',
        description: 'Public addon list — synced from MagguuUI.toc, editable per row.',
        hint: 'Auto-synced from the addon repo; tweak emoji, description or category here without breaking the sync.',
      },
    ],
  },
  {
    title: 'System',
    links: [
      {
        to: '/admin/system/settings',
        label: 'Settings',
        heading: 'Settings',
        icon: 'i-heroicons-cog-6-tooth',
        description: 'Site-wide configuration, tracking and maintenance.',
        hint: 'One place for site defaults, access rules and operational switches.',
        children: [
          { to: '/admin/system/settings?tab=general', label: 'General', icon: 'i-heroicons-cog-6-tooth', description: 'Site name, banner, maintenance.' },
          { to: '/admin/system/settings?tab=seo', label: 'SEO & Links', icon: 'i-heroicons-globe-alt', description: 'Meta tags, social links.' },
          { to: '/admin/system/settings?tab=security', label: 'Security', icon: 'i-heroicons-shield-check', description: 'Sessions, rate limits, tracking.' },
          { to: '/admin/system/settings?tab=ads', label: 'Ads', icon: 'i-heroicons-megaphone', description: 'AdSense configuration.' },
          { to: '/admin/system/settings?tab=data', label: 'Data & Backup', icon: 'i-heroicons-circle-stack', description: 'Retention, backup, reset.' },
        ],
      },
      {
        to: '/admin/system/stats',
        label: 'Analytics',
        heading: 'Analytics',
        icon: 'i-heroicons-chart-bar',
        description: 'Traffic, copies and API usage analytics.',
        hint: 'Traffic, copies and API usage without the old dashboard noise.',
        children: [
          { to: '/admin/system/stats?tab=overview', label: 'Overview', icon: 'i-heroicons-chart-bar', description: 'Key metrics at a glance.' },
          { to: '/admin/system/stats?tab=visitors', label: 'Visitors', icon: 'i-heroicons-eye', description: 'Page views and visitor breakdown.' },
          { to: '/admin/system/stats?tab=copies', label: 'Copies', icon: 'i-heroicons-clipboard-document', description: 'Copy events and top strings.' },
          { to: '/admin/system/stats?tab=api', label: 'API', icon: 'i-heroicons-server', description: 'API endpoint usage.' },
        ],
      },
      {
        to: '/admin/system/users',
        label: 'Users',
        heading: 'Users',
        icon: 'i-heroicons-users',
        description: 'Accounts, passkeys, sessions and access controls.',
        hint: 'Accounts, sessions and security controls without the old dashboard clutter.',
        children: [
          { to: '/admin/system/users?tab=accounts', label: 'Accounts', icon: 'i-heroicons-user-group', description: 'User accounts and roles.' },
          { to: '/admin/system/users?tab=sessions', label: 'Sessions', icon: 'i-heroicons-computer-desktop', description: 'Active login sessions.' },
          { to: '/admin/system/users?tab=attempts', label: 'Login History', icon: 'i-heroicons-shield-exclamation', description: 'Login attempts and flags.' },
        ],
      },
      {
        to: '/admin/system/github',
        label: 'GitHub',
        heading: 'GitHub Sync',
        icon: 'i-simple-icons-github',
        description: 'Repository sync, imports, exports and webhooks.',
        hint: 'Keep repo connectivity, release checks and import/export workflows in one quiet utility page.',
      },
      {
        to: '/admin/system/activity',
        label: 'Activity',
        heading: 'Activity',
        icon: 'i-heroicons-clock',
        description: 'Audit trail of administrative activity.',
        hint: 'Audit changes without turning the log into a dashboard of its own.',
      },
    ],
  },
]

const contextItems: AdminContextItem[] = [
  dashboardContext,
  ...adminSections.flatMap(section =>
    section.links.map(link => ({
      ...link,
      section: section.title,
      heading: link.heading || link.label,
      hint: link.hint || link.description,
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
  { group: 'Actions', to: '/admin/content/changelog?action=create', label: 'New Update', icon: 'i-heroicons-plus', description: 'Document the latest release.' },
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
