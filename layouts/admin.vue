<template>
  <UApp>
    <div class="admin-shell" :style="adminShellStyle">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-200"
        :class="[
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-[hsl(240,5.9%,90%)]',
        ]"
        :style="{ width: `var(--admin-sidebar-width)` }"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 shrink-0" :style="{ height: '50px' }">
          <NuxtLink to="/admin" class="flex min-w-0 items-center gap-2.5">
            <img src="/logo.svg" alt="MagguuUI" class="h-7 w-7 shrink-0">
            <span v-if="!collapsed" class="truncate text-sm font-semibold" :class="isDark ? 'text-white' : 'text-slate-900'">MagguuUI</span>
          </NuxtLink>
          <button
            v-if="!collapsed"
            class="ml-auto p-1 rounded-sm transition-colors shrink-0"
            :class="isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'"
            :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="collapsed = !collapsed"
          >
            <UIcon name="i-heroicons-chevron-double-left" class="h-4 w-4" />
          </button>
          <button
            v-else
            class="mx-auto p-1 rounded-sm transition-colors"
            :class="isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'"
            @click="collapsed = !collapsed"
          >
            <UIcon name="i-heroicons-chevron-double-right" class="h-4 w-4" />
          </button>
        </div>

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
          <NuxtLink
            to="/admin"
            class="vben-nav-item"
            :class="[
              collapsed ? 'justify-center px-0' : '',
              isRouteActive('/admin', true) ? 'vben-nav-item--active' : '',
            ]"
          >
            <UIcon name="i-heroicons-squares-2x2" class="h-[18px] w-[18px] shrink-0" />
            <span v-if="!collapsed" class="truncate">Dashboard</span>
          </NuxtLink>

          <div v-for="section in sections" :key="section.title" class="mt-3">
            <div v-if="collapsed" class="mx-3 my-2 h-px" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />
            <button
              v-else
              class="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors"
              :class="isDark ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'"
              @click="toggleSection(section.title)"
            >
              <span>{{ section.title }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="h-3 w-3 transition-transform duration-200"
                :class="openSections[section.title] ? '' : '-rotate-90'"
              />
            </button>

            <div v-if="collapsed || openSections[section.title]" class="mt-0.5 space-y-0.5">
              <NuxtLink
                v-for="item in section.links"
                :key="item.to"
                :to="item.to"
                class="vben-nav-item"
                :class="[
                  collapsed ? 'justify-center px-0' : '',
                  isRouteActive(item.to) ? 'vben-nav-item--active' : '',
                ]"
                :title="collapsed ? item.label : undefined"
              >
                <UIcon :name="item.icon" class="h-[18px] w-[18px] shrink-0" />
                <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="shrink-0 border-t px-3 py-3" :class="isDark ? 'border-white/8' : 'border-slate-200'">
          <div class="flex items-center gap-2" :class="collapsed ? 'flex-col' : ''">
            <div class="flex min-w-0 items-center gap-2" :class="collapsed ? 'justify-center' : 'flex-1'">
              <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'">
                {{ userInitial }}
              </span>
              <span v-if="!collapsed" class="truncate text-sm font-medium" :class="isDark ? 'text-white' : 'text-slate-900'">{{ user?.username || 'Admin' }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button class="p-1.5 rounded-md transition-colors" :class="isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'" :title="isDark ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
                <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="h-4 w-4" />
              </button>
              <button class="p-1.5 rounded-md transition-colors" :class="isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'" title="Logout" @click="handleLogout">
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Mobile overlay -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/40 lg:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Main -->
      <div class="transition-all duration-200" :style="{ paddingLeft: lgAndUp ? `var(--admin-sidebar-width)` : '0' }">
        <!-- Header -->
        <header
          class="sticky top-0 z-20 flex h-[50px] items-center gap-3 border-b px-4"
          :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-[hsl(240,5.9%,90%)]'"
        >
          <button class="p-1.5 rounded-md lg:hidden" :class="isDark ? 'text-white/60 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'" @click="sidebarOpen = !sidebarOpen">
            <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
          </button>

          <!-- Breadcrumbs -->
          <nav class="flex items-center gap-1.5 text-sm min-w-0">
            <NuxtLink to="/admin" class="shrink-0 transition-colors" :class="isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'">
              <UIcon name="i-heroicons-squares-2x2" class="h-4 w-4" />
            </NuxtLink>
            <template v-if="currentContext.section">
              <UIcon name="i-heroicons-chevron-right" class="h-3.5 w-3.5 shrink-0" :class="isDark ? 'text-white/30' : 'text-slate-300'" />
              <span class="shrink-0" :class="isDark ? 'text-white/50' : 'text-slate-400'">{{ currentContext.section }}</span>
            </template>
            <UIcon name="i-heroicons-chevron-right" class="h-3.5 w-3.5 shrink-0" :class="isDark ? 'text-white/30' : 'text-slate-300'" />
            <span class="truncate font-medium" :class="isDark ? 'text-white' : 'text-slate-900'">{{ pageHeading }}</span>
          </nav>

          <div class="ml-auto flex items-center gap-1">
            <button
              class="vben-header-btn hidden md:inline-flex"
              @click="cmdPalette?.open()"
            >
              <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4" />
              <span class="text-xs ml-1 hidden lg:inline" :class="isDark ? 'text-white/40' : 'text-slate-400'">Search</span>
              <kbd class="hidden lg:inline-flex ml-2 h-5 items-center rounded border px-1.5 text-[10px] font-medium"
                :class="isDark ? 'border-white/10 text-white/30' : 'border-slate-200 text-slate-400'">
                {{ searchShortcut }}
              </kbd>
            </button>

            <button class="vben-header-btn md:hidden" @click="cmdPalette?.open()">
              <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4" />
            </button>

            <!-- Notifications -->
            <div ref="notifWrapRef" class="relative">
              <button ref="notifButtonRef" class="vben-header-btn relative" @click="notifOpen = !notifOpen">
                <UIcon name="i-heroicons-bell" class="h-4 w-4" />
                <span v-if="notifCount > 0" class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {{ notifCount }}
                </span>
              </button>

              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 translate-y-2 scale-95"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 translate-y-0 scale-100"
                leave-to-class="opacity-0 translate-y-2 scale-95"
              >
                <div
                  v-if="notifOpen"
                  ref="notifPanelRef"
                  class="absolute right-0 top-full z-[100] mt-2 w-[22rem] rounded-xl border shadow-xl"
                  :class="isDark ? 'border-white/10 bg-[hsl(222.34,10.43%,14%)] shadow-black/40' : 'border-slate-200 bg-white shadow-slate-200/60'"
                >
                  <div class="flex items-center justify-between px-4 py-3 border-b" :class="isDark ? 'border-white/8' : 'border-slate-100'">
                    <h2 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-slate-900'">Notifications</h2>
                    <span v-if="notifCount > 0" class="text-xs font-medium" :class="isDark ? 'text-white/40' : 'text-slate-400'">{{ notifCount }} active</span>
                  </div>

                  <div v-if="notifItems.length" class="max-h-72 overflow-y-auto py-1">
                    <div
                      v-for="item in notifItems"
                      :key="item.id"
                      class="flex items-start gap-3 px-4 py-2.5 transition-colors"
                      :class="isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'"
                    >
                      <span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        :class="item.type === 'error' ? isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                          : item.type === 'warning' ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
                          : isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'">
                        <UIcon :name="item.type === 'error' ? 'i-heroicons-x-circle' : item.type === 'warning' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'" class="h-3.5 w-3.5" />
                      </span>
                      <div class="min-w-0 flex-1">
                        <NuxtLink v-if="item.link" :to="item.link" class="text-sm font-medium transition-colors" :class="isDark ? 'text-white hover:text-blue-300' : 'text-slate-900 hover:text-blue-600'" @click="notifOpen = false">{{ item.title }}</NuxtLink>
                        <p v-else class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-slate-900'">{{ item.title }}</p>
                        <p class="mt-0.5 text-xs" :class="isDark ? 'text-white/40' : 'text-slate-500'">{{ item.message }}</p>
                      </div>
                      <button class="mt-0.5 p-1 rounded-md shrink-0 transition-colors" :class="isDark ? 'text-white/30 hover:text-white hover:bg-white/[0.06]' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'" @click="notifDismiss(item.id)">
                        <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div v-else class="py-8 text-center">
                    <UIcon name="i-heroicons-bell-slash" class="h-6 w-6 mx-auto mb-1.5" :class="isDark ? 'text-white/20' : 'text-slate-300'" />
                    <p class="text-xs" :class="isDark ? 'text-white/30' : 'text-slate-400'">No notifications</p>
                  </div>
                </div>
              </Transition>
            </div>

            <button class="vben-header-btn" :title="isDark ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
              <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="h-4 w-4" />
            </button>

            <NuxtLink to="/" class="vben-header-btn" title="View site">
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
            </NuxtLink>
          </div>
        </header>

        <!-- Tab Bar -->
        <AdminTabBar />

        <!-- Content -->
        <main class="min-h-[calc(100vh-88px)] p-4" :class="isDark ? 'bg-[hsl(220,13.06%,9%)]' : 'bg-[hsl(216,20%,95.5%)]'">
          <div :key="route.fullPath" class="mx-auto max-w-[1600px]">
            <slot />
          </div>
        </main>
      </div>

      <!-- Mobile Dock -->
      <nav class="admin-mobile-dock lg:hidden">
        <NuxtLink
          v-for="item in dockLinks"
          :key="item.to"
          :to="item.to"
          class="admin-mobile-dock__link"
          :class="isRouteActive(item.to, item.to === '/admin') ? 'admin-mobile-dock__link--active' : ''"
        >
          <UIcon :name="item.icon" class="h-4.5 w-4.5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <CommandPalette ref="cmdPalette" />
      <KeyboardShortcuts />
    </div>
  </UApp>
</template>

<script setup lang="ts">
const route = useRoute()
const colorMode = useColorMode()
const { user, logout } = useAuth()
const isDark = useIsDark()
const { notifications: notifItems, count: notifCount, refresh: notifRefresh, dismiss: notifDismiss } = useAdminNotifications()
const { sections, dockLinks, currentContext } = useAdminNavigation()

const { loadFromStorage: loadTabs, trackCurrentRoute } = useAdminTabs()
const sidebarOpen = ref(false)
const collapsed = ref(false)
const notifOpen = ref(false)
const isMac = ref(false)
const lgAndUp = ref(true)
const cmdPalette = ref<{ open: () => void } | null>(null)
const notifWrapRef = ref<HTMLElement | null>(null)
const notifButtonRef = ref<HTMLElement | null>(null)
const notifPanelRef = ref<HTMLElement | null>(null)

const searchShortcut = computed(() => isMac.value ? '⌘K' : 'Ctrl K')
const userInitial = computed(() => (user.value?.username || 'A').charAt(0).toUpperCase())
const pageHeading = computed(() => currentContext.value.heading || currentContext.value.label)
const adminShellStyle = computed(() => ({
  '--admin-sidebar-width': collapsed.value ? '3.75rem' : '14rem',
}))
const activeSection = computed(() =>
  sections.find(section => section.links.some(link => isRouteActive(link.to)))?.title ?? sections[0]?.title ?? '',
)
const openSections = reactive(
  Object.fromEntries(sections.map(section => [section.title, false])) as Record<string, boolean>,
)

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function setOpenSection(title: string) {
  for (const section of sections) {
    openSections[section.title] = section.title === title
  }
}

function toggleSection(title: string) {
  if (openSections[title]) {
    openSections[title] = false
    return
  }
  setOpenSection(title)
}

function isRouteActive(path: string, exact = false) {
  if (path === '/admin') return route.path === '/admin'
  if (exact) return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}

function handleLogout() {
  logout()
}

function onDocumentClick(event: Event) {
  const target = event.target as Node | null
  if (!target || !notifOpen.value) return
  if (
    notifWrapRef.value?.contains(target)
    || notifButtonRef.value?.contains(target)
    || notifPanelRef.value?.contains(target)
  ) return
  notifOpen.value = false
}

function updateLgBreakpoint() {
  lgAndUp.value = window.innerWidth >= 1024
}

onMounted(() => {
  notifRefresh(true)
  loadTabs()
  trackCurrentRoute()
  if (activeSection.value) setOpenSection(activeSection.value)

  if (!import.meta.client) return

  isMac.value = /Mac|iPhone|iPad/.test(window.navigator.platform)
  collapsed.value = window.localStorage.getItem('admin-sidebar-collapsed') === '1'
  document.addEventListener('click', onDocumentClick)
  updateLgBreakpoint()
  window.addEventListener('resize', updateLgBreakpoint)
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', onDocumentClick)
    window.removeEventListener('resize', updateLgBreakpoint)
  }
})

watch(collapsed, value => {
  if (import.meta.client) window.localStorage.setItem('admin-sidebar-collapsed', value ? '1' : '0')
})

watch(() => route.fullPath, () => {
  notifOpen.value = false
  sidebarOpen.value = false
  trackCurrentRoute()
  if (activeSection.value) setOpenSection(activeSection.value)
})
</script>

<style scoped>
.vben-nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  color: var(--admin-fg-muted);
}
.vben-nav-item:hover {
  background: var(--admin-accent-bg-hover);
  color: var(--admin-fg);
}
.vben-nav-item--active {
  background: hsl(212 100% 45% / 0.12);
  color: hsl(212 100% 50%);
  font-weight: 600;
}
html.dark .vben-nav-item--active {
  background: hsl(212 100% 50% / 0.15);
  color: hsl(212 100% 65%);
}

.vben-header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border-radius: 0.375rem;
  transition: background 0.15s, color 0.15s;
  color: var(--admin-fg-muted);
}
.vben-header-btn:hover {
  background: var(--admin-accent-bg-hover);
  color: var(--admin-fg);
}
</style>
