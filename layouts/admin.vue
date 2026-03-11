<template>
  <UApp>
    <div class="admin-shell">
      <div class="admin-grid-overlay" />

      <aside
        class="fixed inset-y-0 left-0 z-40 px-3 py-3 transition-all duration-300"
        :class="[
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-24' : 'w-[19rem]',
        ]"
      >
        <div class="admin-sidebar-shell flex h-full flex-col overflow-hidden rounded-[1.8rem] p-3">
          <div class="admin-workspace-card">
            <div class="flex items-start gap-3" :class="collapsed ? 'justify-center' : ''">
              <div class="admin-workspace-card__logo">
                <img src="/logo.svg" alt="MagguuUI" class="h-7 w-7">
              </div>

              <div v-if="!collapsed" class="min-w-0 flex-1">
                <p class="admin-page-eyebrow">Workspace</p>
                <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">MagguuUI Control Center</p>
                <div class="mt-3 flex items-center gap-2">
                  <span class="admin-pill admin-pill--success">
                    <span class="h-1.5 w-1.5 rounded-full bg-current" />
                    Live
                  </span>
                  <span class="admin-pill">v{{ appVersion }}</span>
                </div>
              </div>

              <button
                v-if="!collapsed"
                class="admin-icon-button hidden lg:inline-flex"
                title="Collapse sidebar"
                @click="collapsed = true"
              >
                <UIcon name="i-heroicons-chevron-double-left" class="h-4 w-4" />
              </button>
            </div>

            <button
              v-if="collapsed"
              class="admin-icon-button mt-3 hidden w-full justify-center lg:inline-flex"
              title="Expand sidebar"
              @click="collapsed = false"
            >
              <UIcon name="i-heroicons-chevron-double-right" class="h-4 w-4" />
            </button>
          </div>

          <nav class="scrollbar-hide mt-4 flex-1 overflow-y-auto px-1 pb-3">
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

            <div
              v-for="section in sections"
              :key="section.title"
              class="mt-5"
            >
              <div v-if="collapsed" class="mx-auto my-4 h-px w-8 bg-slate-200 dark:bg-white/10" />

              <button
                v-else
                class="flex w-full items-center justify-between px-2 pb-2"
                @click="toggleSection(section.title)"
              >
                <span class="admin-section-label">{{ section.title }}</span>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                  :class="openSections[section.title] ? '' : '-rotate-90'"
                />
              </button>

              <div
                v-if="collapsed || openSections[section.title]"
                class="space-y-1"
              >
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
                  <div v-if="!collapsed" class="min-w-0 flex-1">
                    <span class="block truncate">{{ item.label }}</span>
                    <span class="admin-link__description">{{ item.description }}</span>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </nav>

          <div class="admin-sidebar-footer">
            <div class="admin-sidebar-user">
              <span class="admin-sidebar-user__avatar">{{ userInitial }}</span>

              <div v-if="!collapsed" class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">{{ user?.username || 'Admin' }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Active admin session</p>
              </div>
            </div>

            <div v-if="!collapsed" class="mt-3 flex items-center gap-2">
              <button
                class="admin-icon-button"
                :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="toggleTheme"
              >
                <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="h-4.5 w-4.5" />
              </button>

              <UButton
                icon="i-heroicons-arrow-right-on-rectangle"
                color="neutral"
                variant="subtle"
                class="flex-1 justify-center"
                @click="handleLogout"
              >
                Logout
              </UButton>
            </div>
          </div>
        </div>
      </aside>

      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
        @click="sidebarOpen = false"
      />

      <div class="admin-main-shell transition-all duration-300" :class="collapsed ? 'lg:pl-24' : 'lg:pl-[19rem]'">
        <div class="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
          <header class="admin-toolbar-shell sticky top-4 z-20 mb-6 rounded-[1.5rem]">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <button class="admin-icon-button lg:hidden" @click="sidebarOpen = !sidebarOpen">
                  <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
                </button>

                <button class="admin-icon-button hidden lg:inline-flex" @click="collapsed = !collapsed">
                  <UIcon name="i-heroicons-chevron-double-left" class="h-4.5 w-4.5" :class="collapsed ? 'rotate-180' : ''" />
                </button>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="admin-context-chip">{{ currentContext.section }}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">Control Center</span>
                  </div>
                  <h1 class="mt-2 truncate text-base font-semibold text-slate-950 sm:text-lg dark:text-white">
                    {{ currentContext.label }}
                  </h1>
                  <p class="mt-1 hidden text-sm text-slate-600 sm:block dark:text-slate-400">
                    {{ currentContext.hint }}
                  </p>
                </div>
              </div>

              <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
                <button class="admin-icon-button md:hidden" @click="cmdPalette?.open()">
                  <UIcon name="i-heroicons-magnifying-glass" class="h-4.5 w-4.5" />
                </button>

                <button
                  class="admin-search-trigger hidden md:flex"
                  @click="cmdPalette?.open()"
                >
                  <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4" />
                  <span class="hidden flex-1 text-left lg:inline">Search pages, actions and tools</span>
                  <span class="flex-1 text-left lg:hidden">Search</span>
                  <kbd>{{ searchShortcut }}</kbd>
                </button>

                <NuxtLink to="/" class="admin-icon-button hidden sm:inline-flex" title="Open website">
                  <UIcon name="i-heroicons-globe-alt" class="h-4.5 w-4.5" />
                </NuxtLink>

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
                    enter-active-class="transition duration-150 ease-out"
                    enter-from-class="opacity-0 translate-y-2 scale-95"
                    enter-to-class="opacity-100 translate-y-0 scale-100"
                    leave-active-class="transition duration-100 ease-in"
                    leave-from-class="opacity-100 translate-y-0 scale-100"
                    leave-to-class="opacity-0 translate-y-2 scale-95"
                  >
                    <div
                      v-if="notifOpen"
                      ref="notifPanelRef"
                      class="admin-panel absolute right-0 top-full mt-2 w-[22rem] p-0"
                    >
                      <div class="admin-panel__header border-b border-slate-200/80 px-4 py-3 dark:border-white/8">
                        <div class="admin-panel__head">
                          <div>
                            <h2 class="admin-panel__title">Notifications</h2>
                            <p class="admin-panel__description">{{ notifCount || 0 }} active</p>
                          </div>
                        </div>
                      </div>

                      <div v-if="notifItems.length" class="max-h-80 overflow-y-auto">
                        <div
                          v-for="item in notifItems"
                          :key="item.id"
                          class="admin-notification-row"
                        >
                          <div
                            class="admin-notification-row__icon"
                            :class="notificationToneClass(item.type)"
                          >
                            <UIcon
                              :name="item.type === 'error'
                                ? 'i-heroicons-x-circle'
                                : item.type === 'warning'
                                  ? 'i-heroicons-exclamation-triangle'
                                  : 'i-heroicons-information-circle'"
                              class="h-4 w-4"
                            />
                          </div>

                          <div class="min-w-0 flex-1">
                            <NuxtLink
                              v-if="item.link"
                              :to="item.link"
                              class="block truncate text-sm font-medium text-slate-950 hover:text-blue-700 dark:text-white dark:hover:text-blue-300"
                              @click="notifOpen = false"
                            >
                              {{ item.title }}
                            </NuxtLink>
                            <p v-else class="truncate text-sm font-medium text-slate-950 dark:text-white">
                              {{ item.title }}
                            </p>
                            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.message }}</p>
                          </div>

                          <button class="admin-icon-button h-8 w-8 shrink-0" @click="notifDismiss(item.id)">
                            <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div v-else class="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No notifications
                      </div>
                    </div>
                  </Transition>
                </div>

                <button
                  class="admin-icon-button xl:hidden"
                  :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                  @click="toggleTheme"
                >
                  <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="h-4.5 w-4.5" />
                </button>

                <div class="admin-user-chip hidden xl:flex">
                  <span class="admin-user-chip__avatar">{{ userInitial }}</span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">{{ user?.username || 'Admin' }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Secure session</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main class="flex-1">
            <slot />
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
const { sections, currentContext, dockLinks } = useAdminNavigation()
const config = useRuntimeConfig()

const sidebarOpen = ref(false)
const collapsed = ref(false)
const notifOpen = ref(false)
const isMac = ref(false)
const cmdPalette = ref<{ open: () => void } | null>(null)
const notifWrapRef = ref<HTMLElement | null>(null)
const notifButtonRef = ref<HTMLElement | null>(null)
const notifPanelRef = ref<HTMLElement | null>(null)

const appVersion = computed(() => config.public.appVersion || '3.0.0')
const searchShortcut = computed(() => isMac.value ? 'Cmd K' : 'Ctrl K')
const userInitial = computed(() => (user.value?.username || 'A').charAt(0).toUpperCase())

const openSections = reactive(
  Object.fromEntries(sections.map(section => [section.title, true])) as Record<string, boolean>,
)

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function toggleSection(title: string) {
  openSections[title] = !openSections[title]
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

function ensureActiveSectionVisible() {
  const activeSection = sections.find(section =>
    section.links.some(link => route.path === link.to || route.path.startsWith(`${link.to}/`)),
  )

  if (activeSection) openSections[activeSection.title] = true
}

onMounted(() => {
  notifRefresh(true)
  ensureActiveSectionVisible()

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
  ensureActiveSectionVisible()
})
</script>
