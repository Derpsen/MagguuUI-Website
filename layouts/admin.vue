<template>
  <UApp>
    <div class="admin-shell" :style="adminShellStyle">
      <aside
        class="admin-sidebar-frame fixed z-40 transition-all duration-300"
        :class="[
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ]"
      >
        <div class="admin-sidebar-shell flex h-full flex-col overflow-hidden rounded-xl p-2.5">
          <div class="admin-sidebar-brand">
            <NuxtLink to="/admin" class="flex min-w-0 items-center gap-3">
              <div class="admin-workspace-card__logo">
                <img src="/logo.svg" alt="MagguuUI" class="h-7 w-7">
              </div>

              <div v-if="!collapsed" class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">MagguuUI</p>
              </div>
            </NuxtLink>

            <button
              class="admin-icon-button hidden lg:inline-flex"
              :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              @click="collapsed = !collapsed"
            >
              <UIcon name="i-heroicons-chevron-double-left" class="h-4 w-4" :class="collapsed ? 'rotate-180' : ''" />
            </button>
          </div>

          <nav class="scrollbar-hide mt-4 flex-1 overflow-y-auto px-0.5 pb-2">
            <NuxtLink
              to="/admin"
              class="admin-link"
              :class="[
                collapsed ? 'admin-link--collapsed' : '',
                isRouteActive('/admin', true) ? 'admin-link--active' : '',
              ]"
            >
              <UIcon name="i-heroicons-squares-2x2" class="h-5 w-5 shrink-0" />
              <span v-if="!collapsed" class="truncate">Dashboard</span>
            </NuxtLink>

            <div v-for="section in sections" :key="section.title" class="mt-4">
              <div v-if="collapsed" class="mx-auto my-3 h-px w-6 bg-slate-200 dark:bg-white/10" />

              <div
                v-else
                class="pb-2"
              >
                <button
                  class="admin-section-toggle"
                  :class="openSections[section.title] ? 'admin-section-toggle--open' : ''"
                  @click="toggleSection(section.title)"
                >
                  <span class="admin-section-label">{{ section.title }}</span>
                  <UIcon
                    name="i-heroicons-chevron-down"
                    class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                    :class="openSections[section.title] ? '' : '-rotate-90'"
                  />
                </button>
              </div>

              <div v-if="collapsed || openSections[section.title]" class="space-y-1">
                <NuxtLink
                  v-for="item in section.links"
                  :key="item.to"
                  :to="item.to"
                  class="admin-link"
                  :class="[
                    collapsed ? 'admin-link--collapsed' : '',
                    isRouteActive(item.to) ? 'admin-link--active' : '',
                  ]"
                  :title="item.label"
                >
                  <UIcon :name="item.icon" class="h-5 w-5 shrink-0" />
                  <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                </NuxtLink>
              </div>
            </div>
          </nav>

          <div class="admin-sidebar-footer">
            <div class="flex items-center gap-2" :class="collapsed ? 'flex-col' : ''">
              <div class="admin-sidebar-user min-w-0" :class="collapsed ? 'justify-center' : 'flex-1'">
                <span class="admin-sidebar-user__avatar">{{ userInitial }}</span>
                <p v-if="!collapsed" class="truncate text-sm font-medium text-slate-950 dark:text-white">{{ user?.username || 'Admin' }}</p>
              </div>

              <div class="grid gap-2" :class="collapsed ? 'w-full grid-cols-1' : 'grid-cols-2'">
                <button
                  class="admin-icon-button"
                  :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                  @click="toggleTheme"
                >
                  <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="h-4.5 w-4.5" />
                </button>

                <button
                  class="admin-icon-button"
                  title="Logout"
                  @click="handleLogout"
                >
                  <UIcon name="i-heroicons-arrow-right-on-rectangle" class="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
        @click="sidebarOpen = false"
      />

      <div class="admin-main-shell">
        <div class="admin-main-frame mx-auto flex min-h-screen w-full max-w-[1760px] flex-col px-4 pb-24 lg:pb-8 lg:pl-0 lg:pr-4">
          <header class="admin-toolbar-shell sticky z-20 mb-4 rounded-[1.15rem]">
            <div class="admin-toolbar-shell__row">
              <button class="admin-icon-button lg:hidden" @click="sidebarOpen = !sidebarOpen">
                <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
              </button>

              <div class="ml-auto flex items-center gap-2">
                <button class="admin-icon-button md:hidden" @click="cmdPalette?.open()">
                  <UIcon name="i-heroicons-magnifying-glass" class="h-4.5 w-4.5" />
                </button>

                <button
                  class="admin-search-trigger hidden md:flex"
                  @click="cmdPalette?.open()"
                >
                  <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4" />
                  <span class="flex-1 text-left">Search</span>
                  <kbd class="hidden lg:inline-flex">{{ searchShortcut }}</kbd>
                </button>

                <div ref="notifWrapRef" class="relative">
                  <button
                    ref="notifButtonRef"
                    class="admin-icon-button relative"
                    @click="notifOpen = !notifOpen"
                  >
                    <UIcon name="i-heroicons-bell" class="h-4.5 w-4.5" />
                    <span v-if="notifCount > 0" class="admin-badge-counter">
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
                      class="absolute right-0 top-full z-[100] mt-2.5 w-[24rem] rounded-2xl border shadow-2xl backdrop-blur-xl"
                      :class="isDark
                        ? 'border-white/10 bg-slate-900/95 shadow-black/30'
                        : 'border-slate-200 bg-white/95 shadow-slate-200/50'"
                    >
                      <div class="flex items-center justify-between px-5 py-4 border-b"
                        :class="isDark ? 'border-white/8' : 'border-slate-100'">
                        <div>
                          <h2 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-slate-900'">Notifications</h2>
                          <p class="text-xs mt-0.5" :class="isDark ? 'text-slate-400' : 'text-slate-500'">{{ notifCount || 0 }} active</p>
                        </div>
                        <span v-if="notifCount > 0" class="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold"
                          :class="isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'">
                          {{ notifCount }}
                        </span>
                      </div>

                      <div v-if="notifItems.length" class="max-h-80 overflow-y-auto py-1.5">
                        <div
                          v-for="item in notifItems"
                          :key="item.id"
                          class="flex items-start gap-3 px-4 py-3 mx-1.5 rounded-xl transition-colors"
                          :class="isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'"
                        >
                          <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
                            :class="item.type === 'error'
                              ? isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                              : item.type === 'warning'
                                ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
                                : isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'">
                            <UIcon
                              :name="item.type === 'error'
                                ? 'i-heroicons-x-circle'
                                : item.type === 'warning'
                                  ? 'i-heroicons-exclamation-triangle'
                                  : 'i-heroicons-information-circle'"
                              class="h-4 w-4"
                            />
                          </span>

                          <div class="min-w-0 flex-1">
                            <NuxtLink
                              v-if="item.link"
                              :to="item.link"
                              class="block text-sm font-medium transition-colors"
                              :class="isDark ? 'text-white hover:text-blue-300' : 'text-slate-900 hover:text-blue-700'"
                              @click="notifOpen = false"
                            >
                              {{ item.title }}
                            </NuxtLink>
                            <p v-else class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-slate-900'">
                              {{ item.title }}
                            </p>
                            <p class="mt-0.5 text-xs leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-500'">{{ item.message }}</p>
                          </div>

                          <button
                            class="inline-flex items-center justify-center h-7 w-7 rounded-lg flex-shrink-0 transition-colors"
                            :class="isDark ? 'text-slate-500 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'"
                            @click="notifDismiss(item.id)"
                          >
                            <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div v-else class="px-5 py-10 text-center">
                        <UIcon name="i-heroicons-bell-slash" class="h-8 w-8 mx-auto mb-2" :class="isDark ? 'text-slate-600' : 'text-slate-300'" />
                        <p class="text-sm" :class="isDark ? 'text-slate-500' : 'text-slate-400'">No notifications</p>
                      </div>
                    </div>
                  </Transition>
                </div>

                <button
                  class="admin-icon-button lg:hidden"
                  :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                  @click="toggleTheme"
                >
                  <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div class="admin-toolbar-context">
              <div class="admin-toolbar-context__main">
                <div class="admin-toolbar-context__icon">
                  <UIcon :name="currentContext.icon" class="h-5 w-5" />
                </div>

                <div class="min-w-0">
                  <p class="admin-page-eyebrow">{{ currentContext.section }}</p>
                  <h1 class="admin-page-title">{{ pageHeading }}</h1>
                  <p class="admin-page-description">{{ currentContext.hint }}</p>
                </div>
              </div>
            </div>
          </header>

          <main class="flex-1">
            <div :key="route.fullPath" class="admin-page-shell">
              <slot />
            </div>
          </main>
        </div>
      </div>

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

const sidebarOpen = ref(false)
const collapsed = ref(false)
const notifOpen = ref(false)
const isMac = ref(false)
const cmdPalette = ref<{ open: () => void } | null>(null)
const notifWrapRef = ref<HTMLElement | null>(null)
const notifButtonRef = ref<HTMLElement | null>(null)
const notifPanelRef = ref<HTMLElement | null>(null)

const searchShortcut = computed(() => isMac.value ? 'Cmd K' : 'Ctrl K')
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

function notificationToneClass(type: string) {
  if (type === 'error') return 'admin-tone-danger'
  if (type === 'warning') return 'admin-tone-warning'
  return 'admin-tone-brand'
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

onMounted(() => {
  notifRefresh(true)
  if (activeSection.value) setOpenSection(activeSection.value)

  if (!import.meta.client) return

  isMac.value = /Mac|iPhone|iPad/.test(window.navigator.platform)
  collapsed.value = window.localStorage.getItem('admin-sidebar-collapsed') === '1'
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  if (import.meta.client) document.removeEventListener('click', onDocumentClick)
})

watch(collapsed, value => {
  if (import.meta.client) window.localStorage.setItem('admin-sidebar-collapsed', value ? '1' : '0')
})

watch(() => route.fullPath, () => {
  notifOpen.value = false
  sidebarOpen.value = false
  if (activeSection.value) setOpenSection(activeSection.value)
})
</script>
