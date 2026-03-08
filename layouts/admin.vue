<!--
  Admin Layout — Collapsible Sidebar + Dark/Light Theme
-->

<template>
  <UApp>
  <div class="admin-shell min-h-screen flex transition-colors duration-300"
    :class="isDark ? 'bg-brand-900 text-silver-200' : 'bg-[#f4f7fb] text-gray-800'">
    <div class="admin-grid-overlay" />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 px-3 py-3"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-20' : 'w-72'
      ]"
    >
      <div class="admin-sidebar-shell h-full rounded-[1.75rem] overflow-hidden flex flex-col">

      <!-- Logo + Collapse -->
      <div class="px-3 pt-3 pb-2">
        <div class="rounded-[1.35rem] px-3 py-3 relative"
          :class="isDark ? 'bg-white/[0.04] border border-white/8' : 'bg-white/90 border border-blue-100 shadow-sm'">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
              :class="isDark ? 'bg-white/[0.06] border border-white/8' : 'bg-blue-50 border border-blue-100'">
              <img :src="'/logo.svg'" alt="MagguuUI" class="w-7 h-7" />
            </span>
            <template v-if="!collapsed">
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Workspace</p>
                <p class="text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">MagguuUI Control Center</p>
              </div>
            </template>
            <button class="hidden lg:flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all"
              :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
              @click="collapsed = !collapsed" :title="'Collapse sidebar'">
              <UIcon name="i-heroicons-chevron-double-left" class="w-4 h-4 transition-transform" :class="collapsed ? 'rotate-180' : ''" />
            </button>
          </div>

          <div v-if="!collapsed" class="flex items-center gap-2 mt-3">
            <span class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              :class="isDark ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/15' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              :class="isDark ? 'bg-white/[0.04] text-silver-500 border border-white/8' : 'bg-white text-gray-500 border border-blue-100'">
              v3.0.0
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-3 space-y-1" :class="collapsed ? 'px-2' : 'px-3'">
        <NuxtLink to="/admin"
          class="relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all"
          :class="[collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5', isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.07]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100']"
          exact-active-class="active-nav-item" :style="isRouteActive('/admin', true) ? activeStyle : ''">
          <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5 flex-shrink-0" />
          <span v-if="!collapsed">Dashboard</span>
        </NuxtLink>

        <template v-for="section in sections" :key="section.title">
          <button v-if="!collapsed" class="w-full flex items-center justify-between px-3 mt-6 mb-1.5 group" @click="section.open = !section.open">
            <p class="text-[11px] font-semibold uppercase tracking-wider" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ section.title }}</p>
            <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 transition-transform duration-300 ease-in-out"
              :class="[section.open ? 'rotate-0' : '-rotate-90', isDark ? 'text-silver-600' : 'text-gray-400']" />
          </button>

          <div v-if="collapsed" class="my-3 mx-2 h-px" :class="isDark ? 'bg-brand-400/10' : 'bg-gray-200'" />

          <div v-if="!collapsed" class="sidebar-dropdown overflow-hidden transition-all duration-300 ease-in-out"
            :style="{ maxHeight: section.open ? section.links.length * 40 + 'px' : '0px', opacity: section.open ? 1 : 0 }">
            <div class="space-y-0.5">
              <NuxtLink v-for="item in section.links" :key="item.to" :to="item.to"
                class="relative flex items-center gap-3 rounded-lg text-sm transition-all px-3 py-2"
                :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.07]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'"
                active-class="active-nav-item" :style="isRouteActive(item.to) ? activeStyle : ''">
                <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>

          <template v-if="collapsed">
            <NuxtLink v-for="item in section.links" :key="item.to" :to="item.to"
              class="relative flex items-center justify-center rounded-lg text-sm transition-all px-0 py-2"
              :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.07]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'"
              active-class="active-nav-item" :style="isRouteActive(item.to) ? activeStyle : ''" :title="item.label">
              <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" />
            </NuxtLink>
          </template>
        </template>
      </nav>

      <div class="p-3">
        <div class="rounded-[1.2rem] px-3 py-3"
          :class="isDark ? 'bg-white/[0.03] border border-white/8' : 'bg-white/90 border border-blue-100 shadow-sm'">
          <div v-if="!collapsed" class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Session</p>
              <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ user?.username || 'Admin' }}</p>
            </div>
            <span class="inline-flex items-center gap-2 text-[11px] font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              <span class="w-2 h-2 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
          <div v-else class="flex justify-center">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400">
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-brand-950/60 backdrop-blur-sm lg:hidden" @click="sidebarOpen = false" />

    <div class="flex-1 transition-all duration-300" :class="collapsed ? 'lg:ml-20' : 'lg:ml-72'">
      <header class="sticky top-0 z-20 px-3 sm:px-4 lg:px-6 pt-3">
        <div class="admin-toolbar-shell rounded-[1.75rem] px-3 sm:px-4 lg:px-5 py-3">
          <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div class="flex items-start gap-3 min-w-0">
              <UButton class="lg:hidden mt-1" icon="i-heroicons-bars-3" variant="ghost" color="neutral" @click="sidebarOpen = !sidebarOpen" />

              <span class="inline-flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
                :class="isDark ? 'bg-white/[0.06] border border-white/8 text-brand-300' : 'bg-blue-50 border border-blue-100 text-blue-700'">
                <UIcon :name="currentContext.icon" class="w-5 h-5" />
              </span>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span :class="isDark ? 'text-brand-300' : 'text-blue-700'">{{ currentContext.section }}</span>
                  <span class="admin-context-chip" :class="isDark ? 'bg-white/[0.04] border border-white/8 text-silver-500' : 'bg-white border border-blue-100 text-gray-500'">
                    {{ contextTrail }}
                  </span>
                </div>
                <h1 class="text-lg sm:text-xl font-semibold mt-1" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ currentContext.title }}
                </h1>
                <p class="text-xs sm:text-sm mt-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                  {{ currentContext.hint }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 sm:gap-3 self-end xl:self-auto">
              <NuxtLink to="/"
                class="hidden sm:inline-flex admin-icon-button"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
                :title="'Go to website'">
                <UIcon name="i-heroicons-globe-alt" class="w-4.5 h-4.5" />
              </NuxtLink>

              <button
                class="hidden md:inline-flex admin-search-trigger"
                :class="isDark ? 'bg-white/[0.04] border border-white/8 text-silver-400 hover:text-white hover:bg-white/[0.06]' : 'bg-white border border-blue-100 text-gray-500 hover:text-gray-900 shadow-sm'"
                @click="cmdPalette?.open()"
              >
                <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4" />
                <span class="flex-1 text-left">Search pages, actions and tools</span>
                <kbd class="px-1.5 py-0.5 text-[10px] font-medium rounded"
                  :class="isDark ? 'bg-brand-950/70 text-silver-500 border border-white/8' : 'bg-gray-50 text-gray-500 border border-gray-200'">
                  {{ searchShortcut }}
                </kbd>
              </button>

              <div ref="notifWrapRef" class="relative">
                <button
                  ref="notifButtonRef"
                  class="admin-icon-button relative"
                  :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
                  @click="notifOpen = !notifOpen"
                >
                  <UIcon name="i-heroicons-bell" class="w-4.5 h-4.5" />
                  <span v-if="notifCount > 0"
                    class="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
                    {{ notifCount }}
                  </span>
                </button>

                <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0"
                  leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
                  <div v-if="notifOpen" ref="notifPanelRef"
                    class="absolute right-0 top-full mt-2 w-80 rounded-[1.35rem] shadow-2xl z-50 overflow-hidden"
                    :class="isDark ? 'bg-brand-800 border border-brand-400/15' : 'bg-white border border-gray-200'">
                    <div class="px-4 py-3 border-b flex items-center justify-between gap-3" :class="isDark ? 'border-brand-400/10' : 'border-gray-100'">
                      <div>
                        <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Notifications</p>
                        <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ notifCount || 0 }} active</p>
                      </div>
                    </div>
                    <div v-if="notifItems.length" class="max-h-72 overflow-y-auto divide-y" :class="isDark ? 'divide-brand-400/5' : 'divide-gray-50'">
                      <div v-for="n in notifItems" :key="n.id" class="px-4 py-3 flex gap-3 group hover:bg-white/[0.03] transition-colors">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          :class="n.type === 'error' ? 'bg-red-500/10' : n.type === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'">
                          <UIcon :name="n.type === 'error' ? 'i-heroicons-x-circle' : n.type === 'warning' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'"
                            class="w-3.5 h-3.5" :class="n.type === 'error' ? 'text-red-400' : n.type === 'warning' ? 'text-amber-400' : 'text-blue-400'" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <NuxtLink v-if="n.link" :to="n.link" class="text-sm font-medium hover:underline" :class="isDark ? 'text-white' : 'text-gray-900'" @click="notifOpen = false">
                            {{ n.title }}
                          </NuxtLink>
                          <p v-else class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">{{ n.title }}</p>
                          <p class="text-xs mt-0.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ n.message }}</p>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 transition-opacity text-silver-600 hover:text-silver-400" @click="notifDismiss(n.id)">
                          <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div v-else class="px-4 py-8 text-center">
                      <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">No notifications</p>
                    </div>
                  </div>
                </Transition>
              </div>

              <button
                class="admin-icon-button"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
                :title="isDark ? 'Light theme' : 'Dark theme'"
                @click="toggleTheme">
                <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4.5 h-4.5" />
              </button>

              <div class="hidden lg:flex items-center gap-3 px-3 py-2 admin-user-chip"
                :class="isDark ? 'bg-white/[0.04] border border-white/8' : 'bg-white border border-blue-100 shadow-sm'">
                <span class="inline-flex items-center justify-center w-9 h-9 rounded-full"
                  :class="isDark ? 'bg-brand-400/12 text-brand-300' : 'bg-blue-50 text-blue-700'">
                  {{ userInitial }}
                </span>
                <div>
                  <p class="text-sm font-semibold leading-none" :class="isDark ? 'text-white' : 'text-gray-900'">{{ user?.username || 'Admin' }}</p>
                  <p class="text-[11px] mt-1" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Admin session</p>
                </div>
              </div>

              <UButton icon="i-heroicons-arrow-right-on-rectangle" variant="ghost" color="neutral" size="sm" @click="handleLogout">
                <span class="hidden sm:inline">Logout</span>
              </UButton>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-main-shell p-3 sm:p-4 lg:p-6"><slot /></main>
    </div>

    <!-- Command Palette (Cmd+K) -->
    <CommandPalette ref="cmdPalette" />

    <!-- Keyboard Shortcuts (?) -->
    <KeyboardShortcuts />
  </div>
  </UApp>
</template>

<script setup lang="ts">
const { user, logout } = useAuth()
const colorMode = useColorMode()
const route = useRoute()
const sidebarOpen = ref(false)
const collapsed = ref(false)
const notifOpen = ref(false)
const cmdPalette = ref<InstanceType<typeof CommandPalette> | null>(null)
const notifWrapRef = ref<HTMLElement | null>(null)
const notifButtonRef = ref<HTMLElement | null>(null)
const notifPanelRef = ref<HTMLElement | null>(null)
const isMac = ref(false)

const isDark = useIsDark()
function toggleTheme() { colorMode.preference = isDark.value ? 'light' : 'dark' }

const { notifications: notifItems, count: notifCount, refresh: notifRefresh, dismiss: notifDismiss } = useAdminNotifications()
const searchShortcut = computed(() => isMac.value ? '⌘K' : 'Ctrl K')
const userInitial = computed(() => (user.value?.username || 'A').charAt(0).toUpperCase())

function onDocumentClick(event: Event) {
  const target = event.target as Node | null
  if (!target || !notifOpen.value) return
  if (notifWrapRef.value?.contains(target) || notifButtonRef.value?.contains(target) || notifPanelRef.value?.contains(target)) return
  notifOpen.value = false
}

// ─── Breadcrumbs ───────────────────────
const segmentLabels: Record<string, string> = {
  content: 'Content', strings: 'Data', system: 'System',
  home: 'Homepage', guide: 'Guide', faq: 'FAQ', changelog: 'Changelog',
  profiles: 'Addon Profiles', wowup: 'WowUp', layouts: 'Character Layouts',
  settings: 'Settings', stats: 'Statistics', users: 'Users',
  'api-keys': 'API Keys', github: 'GitHub Sync', activity: 'Activity Log', fields: 'Custom Fields',
}

// Paths that don't have an actual page (just grouping segments)
const nonNavigable = new Set(['/admin/content', '/admin/strings', '/admin/system'])

const breadcrumbs = computed(() => {
  const segments = route.path.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  const crumbs = [{ label: 'Dashboard', to: '/admin', navigable: true }]
  let currentPath = '/admin'
  for (const seg of segments) {
    currentPath += '/' + seg
    crumbs.push({
      label: segmentLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      to: currentPath,
      navigable: !nonNavigable.has(currentPath),
    })
  }
  return crumbs
})

const contextMap = [
  { path: '/admin/content/home', title: 'Homepage Editor', section: 'Content', icon: 'i-heroicons-home-modern', hint: 'Update hero messaging, feature highlights and landing-page content.' },
  { path: '/admin/content/guide', title: 'Guide Editor', section: 'Content', icon: 'i-heroicons-book-open', hint: 'Maintain the onboarding flow and installation instructions.' },
  { path: '/admin/content/faq', title: 'FAQ Editor', section: 'Content', icon: 'i-heroicons-question-mark-circle', hint: 'Keep support answers tidy and easy to scan.' },
  { path: '/admin/content/changelog', title: 'Changelog Editor', section: 'Content', icon: 'i-heroicons-document-text', hint: 'Publish updates with clean version history and release notes.' },
  { path: '/admin/strings/profiles', title: 'Addon Profiles', section: 'Data', icon: 'i-heroicons-cube', hint: 'Manage addon import strings, naming and sort order.' },
  { path: '/admin/strings/wowup', title: 'WowUp Packages', section: 'Data', icon: 'i-heroicons-arrow-down-tray', hint: 'Maintain downloadable package strings and release bundles.' },
  { path: '/admin/strings/layouts', title: 'Character Layouts', section: 'Data', icon: 'i-heroicons-user-circle', hint: 'Curate per-class and per-spec layout imports.' },
  { path: '/admin/system/settings', title: 'Settings', section: 'System', icon: 'i-heroicons-cog-6-tooth', hint: 'Configure site-wide behaviour, links and operational toggles.' },
  { path: '/admin/system/stats', title: 'Statistics', section: 'System', icon: 'i-heroicons-chart-bar', hint: 'Review usage, traffic and recent trends.' },
  { path: '/admin/system/users', title: 'Users', section: 'System', icon: 'i-heroicons-users', hint: 'Control access, authentication methods and team accounts.' },
  { path: '/admin/system/api-keys', title: 'API Keys', section: 'System', icon: 'i-heroicons-key', hint: 'Manage secure integration keys and external access.' },
  { path: '/admin/system/github', title: 'GitHub Sync', section: 'System', icon: 'i-simple-icons-github', hint: 'Monitor repository connectivity and sync tooling.' },
  { path: '/admin/system/activity', title: 'Activity Log', section: 'System', icon: 'i-heroicons-clock', hint: 'Audit changes and recent administrative actions.' },
]

const currentContext = computed(() => {
  const match = contextMap.find(item => route.path === item.path || route.path.startsWith(item.path + '/'))
  if (match) return match
  return {
    path: '/admin',
    title: 'Dashboard',
    section: 'Overview',
    icon: 'i-heroicons-squares-2x2',
    hint: 'Track site health, publishing activity and operational status.',
  }
})

const contextTrail = computed(() => {
  const parents = breadcrumbs.value.slice(0, -1).map(crumb => crumb.label)
  return parents.length ? parents.join(' / ') : 'Workspace'
})

const activeStyle = computed(() => isDark.value
  ? 'color: #3B8BFF; background: rgba(59, 139, 255, 0.08);'
  : 'color: #2563EB; background: rgba(59, 139, 255, 0.08);'
)

function isRouteActive(path: string, exact = false): boolean {
  if (exact) return route.path === path
  return route.path.startsWith(path) && route.path !== '/admin/login'
}

const sections = reactive([
  {
    title: 'Content',
    open: true,
    links: [
      { to: '/admin/content/home', label: 'Homepage', icon: 'i-heroicons-home' },
      { to: '/admin/content/guide', label: 'Guide', icon: 'i-heroicons-book-open' },
      { to: '/admin/content/faq', label: 'FAQ', icon: 'i-heroicons-question-mark-circle' },
      { to: '/admin/content/changelog', label: 'Changelog', icon: 'i-heroicons-document-text' },
    ],
  },
  {
    title: 'Data',
    open: true,
    links: [
      { to: '/admin/strings/profiles', label: 'Addon Profiles', icon: 'i-heroicons-cube' },
      { to: '/admin/strings/wowup', label: 'WowUp', icon: 'i-heroicons-arrow-down-tray' },
      { to: '/admin/strings/layouts', label: 'Character Layouts', icon: 'i-heroicons-user-circle' },
    ],
  },
  {
    title: 'System',
    open: true,
    links: [
      { to: '/admin/system/settings', label: 'Settings', icon: 'i-heroicons-cog-6-tooth' },
      { to: '/admin/system/stats', label: 'Statistics', icon: 'i-heroicons-chart-bar' },
      { to: '/admin/system/users', label: 'Users', icon: 'i-heroicons-users' },
      { to: '/admin/system/api-keys', label: 'API Keys', icon: 'i-heroicons-key' },
      { to: '/admin/system/github', label: 'GitHub Sync', icon: 'i-simple-icons-github' },
      { to: '/admin/system/activity', label: 'Activity Log', icon: 'i-heroicons-clock' },
    ],
  },
])

function handleLogout() { logout() }

onMounted(() => {
  notifRefresh(true)
  if (!import.meta.client) return

  isMac.value = /Mac|iPhone|iPad/.test(window.navigator.platform)
  const storedCollapsed = window.localStorage.getItem('admin-sidebar-collapsed')
  if (storedCollapsed !== null) {
    collapsed.value = storedCollapsed === '1'
  }

  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', onDocumentClick)
  }
})

watch(collapsed, value => {
  if (import.meta.client) {
    window.localStorage.setItem('admin-sidebar-collapsed', value ? '1' : '0')
  }
})

watch(() => route.fullPath, () => {
  notifOpen.value = false
  sidebarOpen.value = false
})
</script>
