<!--
  Default Layout — Public Pages
  Used by: /, /guide, /strings, /changelog
-->

<template>
  <UApp>
  <div class="min-h-screen flex flex-col transition-colors duration-300"
    :class="isDark ? 'bg-[#0a1628] text-silver-200' : 'bg-[#f0f4f8] text-gray-800'">
    <!-- Skip to content (a11y) -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-500 focus:text-white focus:text-sm focus:font-medium">
      Skip to main content
    </a>
    <!-- Navigation -->
    <nav class="sticky top-0 z-50 transition-colors duration-300"
      :style="isDark
        ? 'background: rgba(10, 22, 40, 0.85); backdrop-filter: blur(20px);'
        : 'background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px);'">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-3 group">
            <img :src="'/logo.svg'" alt="MagguuUI" class="w-8 h-8" />
            <span class="text-lg font-bold text-gradient group-hover:opacity-80 transition-opacity">MagguuUI</span>
          </NuxtLink>

          <!-- Desktop Nav -->
          <div class="hidden md:flex items-center gap-1">
            <NuxtLink
              v-for="link in navLinks" :key="link.to" :to="link.to"
              class="relative px-4 py-7 text-sm font-medium transition-all"
              :class="isActive(link.to) ? 'text-brand-400' : isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'"
            >
              {{ link.label }}
              <span v-if="isActive(link.to)" class="absolute bottom-4 left-4 right-4 h-px rounded-full bg-brand-400" style="box-shadow: 0 0 6px rgba(59, 139, 255, 0.3);" />
            </NuxtLink>

            <div class="w-px h-5 mx-2" :class="isDark ? 'bg-silver-700/50' : 'bg-gray-200'" />

            <!-- Theme Toggle -->
            <button
              class="p-2 rounded-lg transition-all"
              :class="isDark ? 'text-silver-500 hover:text-brand-400 hover:bg-white/5' : 'text-gray-400 hover:text-brand-500 hover:bg-gray-100'"
              :title="isDark ? 'Light Theme' : 'Dark Theme'"
              :aria-label="isDark ? 'Light Theme' : 'Dark Theme'"
              @click="setTheme(isDark ? 'light' : 'dark')"
            >
              <svg v-if="isDark" class="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>

            <!-- Login -->
            <NuxtLink v-if="!isLoggedIn" to="/admin/login"
              class="ml-2 px-4 py-2 text-sm font-medium transition-all"
              :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'"
            >
              Login
            </NuxtLink>
          </div>

          <!-- Mobile Menu Button -->
          <button class="md:hidden p-2 rounded-lg transition-all"
            :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'"
            :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
            @click="mobileOpen = !mobileOpen">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileOpen" class="md:hidden px-4 py-3 space-y-1"
          :class="isDark ? 'border-t border-brand-400/8' : 'border-t border-blue-100'">
          <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
            class="block px-4 py-2.5 rounded-lg text-sm font-medium"
            :class="isActive(link.to) ? 'text-brand-400' : isDark ? 'text-silver-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'"
            @click="mobileOpen = false"
          >{{ link.label }}</NuxtLink>

          <div class="flex items-center gap-2 px-4 pt-3 mt-2"
            :class="isDark ? 'border-t border-brand-400/8' : 'border-t border-blue-100'">
            <button class="p-2 rounded-lg"
              :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'"
              @click="setTheme(isDark ? 'light' : 'dark')">
              <svg v-if="isDark" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" /></svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            </button>
            <NuxtLink v-if="!isLoggedIn" to="/admin/login"
              class="px-4 py-2 text-sm font-medium"
              :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'"
              @click="mobileOpen = false">Login</NuxtLink>
          </div>
        </div>
      </Transition>
    </nav>

    <!-- Site Banner (maintenance mode or custom text) -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="maintenanceMode || bannerText" class="relative z-40 text-sm"
        :class="maintenanceMode
          ? 'bg-amber-500/10 border-b border-amber-500/20'
          : 'bg-brand-400/8 border-b border-brand-400/10'">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-2.5">
          <UIcon
            :name="maintenanceMode ? 'i-heroicons-wrench-screwdriver' : 'i-heroicons-megaphone'"
            class="w-4 h-4 flex-shrink-0"
            :class="maintenanceMode ? 'text-amber-400' : 'text-brand-400'"
          />
          <span :class="maintenanceMode ? 'text-amber-300' : isDark ? 'text-silver-300' : 'text-gray-600'">
            {{ bannerText || 'This site is currently undergoing maintenance. Some features may be unavailable.' }}
          </span>
        </div>
      </div>
    </Transition>

    <!-- Admin Bar -->
    <div v-if="isLoggedIn" class="relative z-40 text-xs"
      :style="isDark
        ? 'background: rgba(59, 139, 255, 0.06); border-bottom: 1px solid rgba(59, 139, 255, 0.1);'
        : 'background: rgba(59, 139, 255, 0.04); border-bottom: 1px solid rgba(59, 139, 255, 0.1);'">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-1.5">
        <div class="flex items-center gap-2">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span :class="isDark ? 'text-silver-400' : 'text-gray-500'">Logged in as <strong class="text-brand-400">{{ user?.username }}</strong></span>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin" class="text-brand-400 hover:text-brand-300 font-medium transition-colors">Admin Panel</NuxtLink>
          <span :class="isDark ? 'text-silver-700' : 'text-gray-300'">|</span>
          <button @click="handleLogout" class="font-medium transition-colors" :class="isDark ? 'text-silver-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'">Logout</button>
        </div>
      </div>
    </div>

    <div class="section-divider" />

    <!-- Breadcrumb -->
    <div v-if="breadcrumbLabel" class="py-4 text-center">
      <nav class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'" aria-label="Breadcrumb">
        <NuxtLink to="/" class="hover:text-brand-400 transition-colors">Home</NuxtLink>
        <span class="mx-2">→</span>
        <NuxtLink v-if="breadcrumbSub" :to="breadcrumbParentPath" class="hover:text-brand-400 transition-colors">{{ breadcrumbLabel }}</NuxtLink>
        <span v-else class="text-brand-400">{{ breadcrumbLabel }}</span>
        <template v-if="breadcrumbSub">
          <span class="mx-2">→</span>
          <span class="text-brand-400">{{ breadcrumbSub }}</span>
        </template>
      </nav>
    </div>

    <main id="main-content" class="flex-1"><slot /></main>

    <!-- Footer -->
    <footer class="mt-20">
      <div class="max-w-5xl mx-auto"><div class="h-[2px] w-48 mx-auto glow-blue" :class="isDark ? 'bg-brand-400/30' : 'bg-brand-400/20'" /></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 mb-12">
          <div>
            <div class="inline-flex items-center gap-2.5 mb-3 px-4 py-2.5 rounded-xl"
              :class="isDark ? 'bg-brand-900/40 border border-brand-400/10' : 'bg-white/60 border border-blue-100'">
              <img :src="'/logo.svg'" alt="MagguuUI" class="w-9 h-9" />
              <span class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">MagguuUI</span>
            </div>
            <p class="text-sm leading-relaxed max-w-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Professional WoW UI import strings for all classes and specs</p>
            <!-- Social Icons -->
            <div class="flex items-center gap-3 mt-4">
              <a v-if="socialLinks.github" :href="socialLinks.github" target="_blank" rel="noopener noreferrer"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
                title="GitHub">
                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              </a>
              <a v-if="socialLinks.discord" :href="socialLinks.discord" target="_blank" rel="noopener noreferrer"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
                title="Discord">
                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
              </a>
              <a v-if="socialLinks.curseforge" :href="socialLinks.curseforge" target="_blank" rel="noopener noreferrer"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
                title="CurseForge">
                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.326 9.2025h-2.6408l-.6327-1.0023H5.6723v-1.5H18.326v2.5023zm-3.3735 0L11.2 15.8h-4.5l3.752-6.5975h4.5z" /></svg>
              </a>
            </div>
          </div>
          <div>
            <span class="block text-xs font-bold uppercase tracking-wider mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Navigation</span>
            <div class="space-y-2.5">
              <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
                class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ link.label }}</NuxtLink>
            </div>
          </div>
          <div>
            <span class="block text-xs font-bold uppercase tracking-wider mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Legal</span>
            <div class="space-y-2.5">
              <NuxtLink to="/imprint" class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">Imprint</NuxtLink>
              <NuxtLink to="/privacy" class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">Privacy</NuxtLink>
              <NuxtLink to="/about" class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">About</NuxtLink>
              <a href="mailto:contact@magguui.com" class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">Contact</a>
            </div>
          </div>
          <div>
            <span class="block text-xs font-bold uppercase tracking-wider mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Resources</span>
            <div class="space-y-2.5">
              <a v-if="socialLinks.github" :href="socialLinks.github" target="_blank" rel="noopener noreferrer"
                class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">GitHub</a>
              <a v-if="socialLinks.discord" :href="socialLinks.discord" target="_blank" rel="noopener noreferrer"
                class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">Discord</a>
              <a v-if="socialLinks.curseforge" :href="socialLinks.curseforge" target="_blank" rel="noopener noreferrer"
                class="block text-sm hover:text-brand-400 hover:translate-x-1 transition-all duration-200"
                :class="isDark ? 'text-silver-500' : 'text-gray-500'">CurseForge</a>
            </div>
          </div>
        </div>
        <div class="pt-6" :class="isDark ? 'border-t border-brand-400/5' : 'border-t border-blue-100'">
          <p class="text-center text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">&copy; {{ new Date().getFullYear() }} MagguuUI. All rights reserved.</p>
        </div>
      </div>
    </footer>

    <!-- Back to Top -->
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
      <button v-if="showBackToTop" class="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all z-40 btn-gradient" @click="scrollToTop">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
      </button>
    </Transition>
  </div>
  </UApp>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const mobileOpen = ref(false)
const showBackToTop = ref(false)
const { user, isLoggedIn, logout } = useAuth()
const isDark = useIsDark()

// Anonymous page view tracking (public pages only)
usePageTracking()
function setTheme(mode: 'light' | 'dark') { colorMode.preference = mode }
function handleLogout() { logout() }

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/strings', label: 'Import Strings' },
  { to: '/guide', label: 'Guides' },
  { to: '/changelog', label: 'Changelog' },
  { to: '/faq', label: 'FAQ' },
]

// Social links + site status from settings (cached globally via useState)
const siteSettings = useState<Record<string, string>>('site-settings', () => ({}))
const socialLinks = computed(() => ({
  github: siteSettings.value.github_url || 'https://github.com/Derpsen/MagguuUI',
  discord: siteSettings.value.discord_url || '',
  curseforge: siteSettings.value.curseforge_url || '',
}))
const bannerText = computed(() => siteSettings.value.banner_text || '')
const maintenanceMode = computed(() => siteSettings.value.maintenance_mode === 'true')
onMounted(async () => {
  // Only fetch if not already cached
  if (Object.keys(siteSettings.value).length > 0) return
  try {
    const res = await $fetch<{ data: Record<string, string> }>('/api/v1/settings')
    if (res?.data) siteSettings.value = res.data
  } catch { /* ok */ }
})

const breadcrumbLabel = computed(() => {
  const match = navLinks.find(l => l.to !== '/' && route.path.startsWith(l.to))
  return match?.label || null
})

const breadcrumbSub = computed(() => {
  if (route.path !== '/strings') return null
  const tabMap: Record<string, string> = {
    layouts: 'Cooldown Layouts',
    profiles: 'Addon Profiles',
    wowup: 'WowUp Import String',
  }
  const tab = (route.query.tab as string) || 'layouts'
  return tabMap[tab] || null
})

const breadcrumbParentPath = computed(() => {
  if (route.path === '/strings') return '/strings'
  return route.path
})

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
onMounted(() => { window.addEventListener('scroll', () => { showBackToTop.value = window.scrollY > 400 }) })
</script>
