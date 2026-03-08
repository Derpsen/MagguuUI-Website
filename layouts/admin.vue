<!--
  Admin Layout — Collapsible Sidebar + Dark/Light Theme
-->

<template>
  <UApp>
  <div class="min-h-screen flex transition-colors duration-300"
    :class="isDark ? 'bg-brand-900 text-silver-200' : 'bg-[#f0f4f8] text-gray-800'">

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 backdrop-blur-xl"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-16' : 'w-64',
        isDark ? 'bg-brand-800/90' : 'bg-white/95 shadow-lg'
      ]"
    >
      <div class="absolute top-0 right-0 bottom-0 w-px"
        :class="isDark ? 'bg-gradient-to-b from-transparent via-brand-400/15 to-transparent' : 'bg-gradient-to-b from-transparent via-blue-200 to-transparent'" />

      <!-- Logo + Collapse -->
      <div class="h-16 flex items-center px-3 relative">
        <template v-if="!collapsed">
          <img :src="'/logo.svg'" alt="MagguuUI" class="w-8 h-8 flex-shrink-0" />
          <span class="font-bold text-sm ml-2.5 flex-1" :class="isDark ? 'text-white' : 'text-gray-900'">MagguuUI</span>
        </template>
        <div v-else class="flex-1" />
        <button class="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all"
          :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
          @click="collapsed = !collapsed" :title="'Collapse sidebar'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div class="absolute bottom-0 left-4 right-4 h-px"
          :class="isDark ? 'bg-gradient-to-r from-transparent via-brand-400/15 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-100 to-transparent'" />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 space-y-1" :class="collapsed ? 'px-2' : 'px-3'">
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

      <div class="p-3 relative">
        <div class="absolute top-0 left-4 right-4 h-px"
          :class="isDark ? 'bg-gradient-to-r from-transparent via-brand-400/15 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-100 to-transparent'" />
        <div class="text-center py-1.5">
          <span v-if="!collapsed" class="text-[11px] font-medium tabular-nums" :class="isDark ? 'text-silver-600' : 'text-gray-400'">MagguuUI v3.0.0</span>
          <span v-else class="text-[9px] font-medium" :class="isDark ? 'text-silver-600' : 'text-gray-400'">v3</span>
        </div>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-black/60 lg:hidden" @click="sidebarOpen = false" />

    <!-- Main -->
    <div class="flex-1 transition-all duration-300" :class="collapsed ? 'lg:ml-16' : 'lg:ml-64'">
      <!-- Top Bar -->
      <header class="sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-8 relative transition-colors duration-300"
        :class="isDark ? 'glass' : 'bg-white/90 backdrop-blur-xl shadow-sm'">
        <div class="absolute bottom-0 left-0 right-0 h-px"
          :class="isDark ? 'bg-gradient-to-r from-transparent via-brand-400/15 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-100 to-transparent'" />

        <!-- Left: Mobile menu + Globe + Lang + Theme -->
        <div class="flex items-center gap-3">
          <UButton class="lg:hidden" icon="i-heroicons-bars-3" variant="ghost" color="neutral" @click="sidebarOpen = !sidebarOpen" />

          <NuxtLink to="/"
            class="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
            :title="'Go to website'">
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          </NuxtLink>

          <div class="w-px h-5" :class="isDark ? 'bg-brand-400/15' : 'bg-gray-200'" />

          <!-- Theme Toggle -->
          <button
            class="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            :class="isDark ? 'text-silver-500 hover:text-brand-400 hover:bg-white/5' : 'text-gray-400 hover:text-brand-500 hover:bg-gray-100'"
            :title="isDark ? 'Light theme' : 'Dark theme'"
            @click="toggleTheme">
            <svg v-if="isDark" class="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </button>

          <!-- Breadcrumbs -->
          <div class="hidden md:flex items-center gap-1">
            <div class="w-px h-5" :class="isDark ? 'bg-brand-400/15' : 'bg-gray-200'" />
            <nav class="flex items-center gap-1 text-sm ml-3">
              <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.to">
                <UIcon v-if="idx > 0" name="i-heroicons-chevron-right" class="w-3.5 h-3.5 flex-shrink-0" :class="isDark ? 'text-silver-600' : 'text-gray-300'" />
                <NuxtLink v-if="idx < breadcrumbs.length - 1 && crumb.navigable" :to="crumb.to"
                  class="transition-colors whitespace-nowrap" :class="isDark ? 'text-silver-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'">
                  {{ crumb.label }}
                </NuxtLink>
                <span v-else-if="idx < breadcrumbs.length - 1"
                  class="whitespace-nowrap" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ crumb.label }}
                </span>
                <span v-else class="font-medium whitespace-nowrap" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ crumb.label }}
                </span>
              </template>
            </nav>
          </div>
        </div>

        <!-- Right: Notifications + admin + Logout -->
        <div class="flex items-center gap-3">
          <!-- Notification Bell -->
          <div class="relative">
            <button
              class="flex items-center justify-center w-8 h-8 rounded-lg transition-all relative"
              :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
              @click="notifOpen = !notifOpen">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span v-if="notifCount > 0"
                class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {{ notifCount }}
              </span>
            </button>
            <!-- Dropdown -->
            <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
              <div v-if="notifOpen" class="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                :class="isDark ? 'bg-brand-800 border border-brand-400/15' : 'bg-white border border-gray-200'">
                <div class="px-4 py-3 border-b" :class="isDark ? 'border-brand-400/10' : 'border-gray-100'">
                  <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                    {{ 'Notifications' }}
                  </p>
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
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div v-else class="px-4 py-8 text-center">
                  <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">No notifications</p>
                </div>
              </div>
            </Transition>
          </div>

          <div class="w-px h-5" :class="isDark ? 'bg-brand-400/15' : 'bg-gray-200'" />

          <!-- Search / Cmd+K -->
          <button
            class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
            :class="isDark ? 'text-silver-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-brand-400/10' : 'text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200'"
            @click="cmdPalette?.open()">
            <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd class="ml-2 px-1 py-0.5 text-[10px] font-medium rounded"
              :class="isDark ? 'bg-brand-900/50 text-silver-600 border border-brand-400/10' : 'bg-white text-gray-400 border border-gray-200'">
              ⌘K
            </kbd>
          </button>

          <div class="w-px h-5" :class="isDark ? 'bg-brand-400/15' : 'bg-gray-200'" />
          <span class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ user?.username }}</span>
          <UButton icon="i-heroicons-arrow-right-on-rectangle" variant="ghost" color="neutral" size="sm" @click="handleLogout">
            Logout
          </UButton>
        </div>
      </header>

      <main class="p-4 lg:p-8"><slot /></main>
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

const isDark = useIsDark()
function toggleTheme() { colorMode.preference = isDark.value ? 'light' : 'dark' }

// Notifications
const { notifications: notifItems, count: notifCount, refresh: notifRefresh, dismiss: notifDismiss } = useAdminNotifications()
onMounted(() => { notifRefresh(true) })
// Close dropdown on click outside
if (import.meta.client) {
  document.addEventListener('click', (e) => {
    if (notifOpen.value && !(e.target as HTMLElement).closest('.relative')) notifOpen.value = false
  })
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
</script>
