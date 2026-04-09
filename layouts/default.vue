<!--
  Default Layout — Public Pages
  Used by: /, /guide, /strings, /changelog
-->

<template>
  <UApp>
  <div class="public-shell min-h-screen flex flex-col transition-colors duration-300"
    :class="isDark ? 'bg-[#081426] text-silver-200' : 'bg-[#eef4fb] text-gray-800'">
    <div class="public-grid-overlay" />
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-brand-500 focus:text-white focus:text-sm focus:font-medium">
      Skip to main content
    </a>
    <div class="fixed inset-x-0 top-0 z-[70] h-[3px] pointer-events-none">
      <div class="public-progress-bar" :style="{ transform: `scaleX(${scrollProgress})` }" />
    </div>

    <header class="relative sticky top-0 z-50 px-3 sm:px-5 pt-3 pb-4">
      <div class="public-header-backdrop" />
      <div class="relative max-w-6xl mx-auto">
        <div class="public-nav-shell rounded-[1.45rem] px-3 sm:px-4 py-3">
          <div class="flex items-center justify-between gap-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <NuxtLink to="/" class="flex items-center gap-3 min-w-0 group">
              <span class="inline-flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-[1.04]"
                :class="isDark ? 'bg-white/[0.06] border border-white/10' : 'bg-white/90 border border-blue-100 shadow-sm'">
                <img :src="'/logo.svg'" alt="MagguuUI" class="w-7 h-7" />
              </span>
              <span class="text-sm sm:text-[15px] font-semibold truncate whitespace-nowrap" :class="isDark ? 'text-white' : 'text-gray-900'">{{ siteName }}</span>
            </NuxtLink>

            <div class="hidden lg:flex justify-center px-4">
              <nav class="inline-flex items-center gap-1.5 rounded-full p-1"
                :class="isDark ? 'bg-white/[0.03] border border-white/8' : 'bg-white/80 border border-blue-100 shadow-sm'">
                <NuxtLink
                  v-for="link in navLinks" :key="link.to" :to="link.to"
                  class="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all"
                  :class="isActive(link.to)
                    ? isDark
                      ? 'bg-brand-400/12 text-brand-300'
                      : 'bg-blue-50 text-blue-700'
                    : isDark
                      ? 'text-silver-400 hover:text-white hover:bg-white/[0.05]'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white'"
                >
                  <UIcon :name="link.icon" class="w-3.5 h-3.5 opacity-80" />
                  {{ link.label }}
                </NuxtLink>
              </nav>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="admin-icon-button"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white/90 border border-blue-100 shadow-sm'"
                :title="isDark ? 'Light Theme' : 'Dark Theme'"
                :aria-label="isDark ? 'Light Theme' : 'Dark Theme'"
                @click="setTheme(isDark ? 'light' : 'dark')"
              >
                <UIcon v-if="isDark" name="i-heroicons-sun" class="w-4.5 h-4.5" />
                <UIcon v-else name="i-heroicons-moon" class="w-4.5 h-4.5" />
              </button>

              <div class="hidden lg:block h-8 w-px" :class="isDark ? 'bg-white/8' : 'bg-blue-100'" />

              <NuxtLink v-if="isLoggedIn" to="/admin"
                class="hidden md:inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all"
                :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.05] border border-white/8' : 'text-gray-700 hover:text-gray-900 hover:bg-white/90 border border-blue-100 shadow-sm'">
                <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
                Admin
              </NuxtLink>
              <NuxtLink v-else to="/admin/login"
                class="hidden md:inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all"
                :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.05] border border-white/8' : 'text-gray-700 hover:text-gray-900 hover:bg-white/90 border border-blue-100 shadow-sm'">
                <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
                Login
              </NuxtLink>

              <NuxtLink :to="primaryAction.to"
                class="hidden lg:inline-flex items-center justify-center gap-2 btn-gradient rounded-full min-h-[2.5rem] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap">
                <UIcon :name="primaryAction.icon" class="w-4 h-4" />
                {{ primaryAction.label }}
              </NuxtLink>

              <button class="md:hidden admin-icon-button"
                :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-600 hover:text-gray-900 hover:bg-white/90 border border-blue-100 shadow-sm'"
                :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
                @click="mobileOpen = !mobileOpen">
                <UIcon :name="mobileOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="hidden md:flex lg:hidden items-center justify-between gap-3 mt-3 pt-3"
            :class="isDark ? 'border-t border-white/8' : 'border-t border-blue-100'">
            <nav class="flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
              <NuxtLink
                v-for="link in navLinks" :key="link.to" :to="link.to"
                class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all"
                :class="isActive(link.to)
                  ? isDark
                    ? 'bg-brand-400/12 text-brand-300'
                    : 'bg-blue-50 text-blue-700'
                  : isDark
                    ? 'text-silver-400 hover:text-white hover:bg-white/[0.05]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white'"
              >
                <UIcon :name="link.icon" class="w-3.5 h-3.5 opacity-80" />
                {{ link.label }}
              </NuxtLink>
            </nav>

            <NuxtLink :to="primaryAction.to"
              class="inline-flex items-center justify-center gap-2 rounded-full min-h-[2.5rem] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap btn-gradient">
              <UIcon :name="primaryAction.icon" class="w-4 h-4" />
              {{ primaryAction.label }}
            </NuxtLink>
          </div>
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="isLoggedIn"
            class="mt-3 px-1 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b"
            :class="isDark ? 'border-white/8' : 'border-blue-100'"
          >
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                :class="isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'">
                <UIcon name="i-heroicons-shield-check" class="w-4.5 h-4.5" />
              </span>
              <div>
                <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  Admin session active
                </p>
                <p class="text-xs sm:text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                  Logged in as <strong class="font-semibold" :class="isDark ? 'text-brand-300' : 'text-blue-700'">{{ user?.username }}</strong>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <NuxtLink to="/admin"
                class="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all"
                :class="isDark ? 'text-brand-300 hover:text-white hover:bg-white/[0.05]' : 'text-blue-700 hover:text-blue-800 hover:bg-white/70'">
                <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
                Admin Panel
              </NuxtLink>
              <button @click="handleLogout"
                class="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.05]' : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'">
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </header>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="mobileOpen" class="fixed inset-0 z-[65] md:hidden">
        <button
          class="absolute inset-0 bg-brand-950/55 backdrop-blur-sm"
          aria-label="Close mobile menu"
          @click="mobileOpen = false"
        />

        <div class="absolute inset-x-3 top-[5.4rem]">
          <div class="public-nav-shell rounded-[1.6rem] p-4 shadow-2xl">
            <div class="flex justify-end mb-4">
              <NuxtLink :to="primaryAction.to"
                class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-white whitespace-nowrap btn-gradient"
                @click="mobileOpen = false">
                <UIcon :name="primaryAction.icon" class="w-3.5 h-3.5" />
                {{ primaryAction.label }}
              </NuxtLink>
            </div>

            <div class="grid gap-2">
              <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
                class="public-quick-card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap"
                :class="isActive(link.to)
                  ? isDark
                    ? 'text-white border-brand-400/25'
                    : 'text-gray-900 border-blue-200'
                  : isDark
                    ? 'text-silver-300'
                    : 'text-gray-600'"
                @click="mobileOpen = false">
                <span class="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                  :class="isActive(link.to)
                    ? isDark
                      ? 'bg-brand-400/14 text-brand-300'
                      : 'bg-blue-50 text-blue-600'
                    : isDark
                      ? 'bg-white/[0.05] text-silver-400'
                      : 'bg-white text-gray-500 border border-blue-100'">
                  <UIcon :name="link.icon" class="w-4 h-4" />
                </span>
                <span class="flex-1">{{ link.label }}</span>
                <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 opacity-60" />
              </NuxtLink>
            </div>

            <div class="flex items-center justify-between gap-3 mt-4 pt-4 border-t"
              :class="isDark ? 'border-white/8' : 'border-blue-100'">
              <button
                class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all"
                :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.05]' : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'"
                @click="setTheme(isDark ? 'light' : 'dark')"
              >
                <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4 h-4" />
                {{ isDark ? 'Light mode' : 'Dark mode' }}
              </button>

              <NuxtLink :to="isLoggedIn ? '/admin' : '/admin/login'"
                class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all"
                :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.05]' : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'"
                @click="mobileOpen = false">
                <UIcon :name="isLoggedIn ? 'i-heroicons-squares-2x2' : 'i-heroicons-lock-closed'" class="w-4 h-4" />
                {{ isLoggedIn ? 'Admin' : 'Login' }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div class="relative z-20">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="maintenanceMode || bannerText" class="px-4 sm:px-6 lg:px-8 mt-3">
          <div class="max-w-7xl mx-auto">
            <div class="surface-panel rounded-2xl px-4 py-3 flex items-start sm:items-center justify-between gap-3"
              :class="maintenanceMode
                ? isDark
                  ? 'border-amber-400/20'
                  : 'border-amber-200'
                : isDark
                  ? 'border-brand-400/12'
                  : 'border-blue-100'">
              <div class="flex items-start gap-3">
                <span class="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                  :class="maintenanceMode
                    ? isDark
                      ? 'bg-amber-400/10 text-amber-300'
                      : 'bg-amber-50 text-amber-700'
                    : isDark
                      ? 'bg-brand-400/12 text-brand-300'
                      : 'bg-blue-50 text-blue-700'">
                  <UIcon :name="maintenanceMode ? 'i-heroicons-wrench-screwdriver' : 'i-heroicons-megaphone'" class="w-4.5 h-4.5" />
                </span>
                <div>
                  <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                    {{ maintenanceMode ? 'Maintenance mode enabled' : 'Site notice' }}
                  </p>
                  <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                    {{ bannerText || 'This site is currently undergoing maintenance. Some features may be unavailable.' }}
                  </p>
                </div>
              </div>

              <span class="hidden sm:inline-flex public-status-chip" :class="siteStatusClasses">
                <span class="inline-block w-2 h-2 rounded-full" :class="siteStatusDot" />
                {{ siteStatusLabel }}
              </span>
            </div>
          </div>
        </div>
      </Transition>

    </div>

    <main id="main-content" class="public-main-shell flex-1"><slot /></main>

    <footer class="mt-16 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10">
      <div class="max-w-7xl mx-auto">
        <div class="surface-panel rounded-[2rem] p-5 sm:p-6 lg:p-7">
          <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold mb-2.5" :class="isDark ? 'text-white' : 'text-gray-900'">
                One place for setup, imports and upkeep.
              </h2>
              <p class="text-sm max-w-xl leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                  {{ siteName }} is built to get your main character ready fast and make alt setup repeatable. The website stays focused: quick copy flows, install guidance and clear updates.
              </p>

              <div class="grid sm:grid-cols-3 gap-2.5 mt-5">
                <div v-for="item in footerHighlights" :key="item.label" class="public-quick-card rounded-[1.15rem] px-3.5 py-3.5">
                  <p class="text-[10px] font-semibold uppercase tracking-[0.18em] mb-1.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
                    {{ item.label }}
                  </p>
                  <p class="text-base sm:text-[1.05rem] font-semibold mb-1" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.value }}</p>
                  <p class="text-xs leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ item.text }}</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div v-for="group in footerGroups" :key="group.title">
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em] mb-3" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ group.title }}
                </p>
                <div class="footer-link-stack flex flex-col gap-2">
                  <template v-for="link in group.links" :key="link.label">
                    <NuxtLink
                      v-if="link.to"
                      :to="link.to"
                      class="text-sm"
                      :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'"
                    >
                      <UIcon :name="link.icon" class="w-4 h-4" />
                      {{ link.label }}
                    </NuxtLink>
                    <a
                      v-else-if="link.href"
                      :href="link.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm"
                      :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'"
                    >
                      <UIcon :name="link.icon" class="w-4 h-4" />
                      {{ link.label }}
                    </a>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-5 border-t flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            :class="isDark ? 'border-white/8' : 'border-blue-100'">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center justify-center w-9 h-9 rounded-[1rem]"
                :class="isDark ? 'bg-white/[0.05] border border-white/8' : 'bg-white border border-blue-100 shadow-sm'">
                <img :src="'/logo.svg'" alt="MagguuUI" class="w-5 h-5" />
              </span>
              <div>
                  <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ siteName }}</p>
                <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">&copy; {{ new Date().getFullYear() }} All rights reserved.</p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <a v-if="socialLinks.github" :href="socialLinks.github" target="_blank" rel="noopener noreferrer"
                class="admin-icon-button"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
                title="GitHub"
                aria-label="Open GitHub">
                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              </a>
              <a v-if="socialLinks.discord" :href="socialLinks.discord" target="_blank" rel="noopener noreferrer"
                class="admin-icon-button"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
                title="Discord"
                aria-label="Open Discord">
                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
              </a>
              <a v-if="socialLinks.curseforge" :href="socialLinks.curseforge" target="_blank" rel="noopener noreferrer"
                class="admin-icon-button"
                :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
                title="CurseForge"
                aria-label="Open CurseForge">
                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.326 9.2025h-2.6408l-.6327-1.0023H5.6723v-1.5H18.326v2.5023zm-3.3735 0L11.2 15.8h-4.5l3.752-6.5975h4.5z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
        <button v-if="showBackToTop" class="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center w-12 h-12 rounded-full text-white btn-gradient shadow-xl" aria-label="Back to top" @click="scrollToTop">
          <UIcon name="i-heroicons-arrow-up" class="w-5 h-5" />
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
const scrollProgress = ref(0)
const { user, isLoggedIn, logout } = useAuth()
const isDark = useIsDark()
const siteSettings = await usePublicSiteSettings()
const siteName = computed(() => siteSettings.value.site_name || 'MagguuUI')

usePageTracking()

function setTheme(mode: 'light' | 'dark') {
  colorMode.preference = mode
}

function handleLogout() {
  logout()
}

const navLinks = [
  { to: '/', label: 'Home', icon: 'i-heroicons-home' },
  { to: '/strings', label: 'Import Strings', icon: 'i-heroicons-bolt' },
  { to: '/addons', label: 'Addons', icon: 'i-heroicons-puzzle-piece' },
  { to: '/guide', label: 'Guides', icon: 'i-heroicons-book-open' },
  { to: '/changelog', label: 'Changelog', icon: 'i-heroicons-sparkles' },
  { to: '/faq', label: 'FAQ', icon: 'i-heroicons-question-mark-circle' },
]

const primaryAction = computed(() => {
  if (route.path === '/guide') return { to: '/strings', label: 'Strings', icon: 'i-heroicons-bolt' }
  if (route.path === '/strings') return { to: '/guide', label: 'Guide', icon: 'i-heroicons-book-open' }
  return { to: '/guide', label: 'Setup', icon: 'i-heroicons-arrow-right' }
})

const footerHighlights = [
  {
    label: 'Setup Flow',
    value: 'Main first',
    text: 'Configure once on your main character, then keep the rest of the account consistent.',
  },
  {
    label: 'Import Pace',
    value: 'Quick copy',
    text: 'Strings, packages and install help stay within a few clicks instead of scattered docs.',
  },
  {
    label: 'Ongoing',
    value: 'Always tidy',
    text: 'Changelog and admin tooling keep updates visible without turning the site into a maze.',
  },
]

const socialLinks = computed(() => ({
  github: siteSettings.value.github_url || 'https://github.com/Derpsen/MagguuUI',
  discord: siteSettings.value.discord_url || '',
  curseforge: siteSettings.value.curseforge_url || '',
}))
const footerGroups = computed(() => [
  {
    title: 'Explore',
    links: [
      { label: 'Home', to: '/', icon: 'i-heroicons-home' },
      { label: 'Import Strings', to: '/strings', icon: 'i-heroicons-bolt' },
      { label: 'Addons', to: '/addons', icon: 'i-heroicons-puzzle-piece' },
      { label: 'Guides', to: '/guide', icon: 'i-heroicons-book-open' },
    ],
  },
  {
    title: 'Need To Know',
    links: [
      { label: 'Changelog', to: '/changelog', icon: 'i-heroicons-sparkles' },
      { label: 'FAQ', to: '/faq', icon: 'i-heroicons-question-mark-circle' },
      { label: 'About', to: '/about', icon: 'i-heroicons-information-circle' },
    ],
  },
  {
    title: 'Legal',
      links: [
        { label: 'Imprint', to: '/imprint', icon: 'i-heroicons-scale' },
        { label: 'Privacy', to: '/privacy', icon: 'i-heroicons-shield-check' },
        { label: 'Contact', href: `mailto:${siteSettings.value.contact_email || 'contact@magguui.com'}`, icon: 'i-heroicons-envelope' },
      ],
    },
  ])
const bannerText = computed(() => siteSettings.value.banner_text || '')
const maintenanceMode = computed(() => siteSettings.value.maintenance_mode === 'true')
const siteStatusLabel = computed(() => {
  if (maintenanceMode.value) return 'Maintenance'
  if (bannerText.value) return 'Notice'
  return 'Live'
})
const siteStatusDot = computed(() => {
  if (maintenanceMode.value) return 'bg-amber-400'
  if (bannerText.value) return 'bg-blue-400'
  return 'bg-emerald-400'
})
const siteStatusClasses = computed(() => {
  if (maintenanceMode.value) {
    return isDark.value
      ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
      : 'bg-amber-50 text-amber-700 border border-amber-200'
  }
  if (bannerText.value) {
    return isDark.value
      ? 'bg-brand-400/10 text-brand-300 border border-brand-400/18'
      : 'bg-blue-50 text-blue-700 border border-blue-100'
  }
  return isDark.value
    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20'
    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
})

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function handleWindowScroll() {
  if (!import.meta.client) return
  const scrollY = window.scrollY
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  showBackToTop.value = scrollY > 400
  scrollProgress.value = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  handleWindowScroll()
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('scroll', handleWindowScroll)
  }
})

watch(() => route.fullPath, () => {
  mobileOpen.value = false
  if (import.meta.client) handleWindowScroll()
})
</script>
