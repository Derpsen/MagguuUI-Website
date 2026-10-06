<!--
  Sticky Guide ↔ Import Strings switcher for /guide and /strings.
-->
<template>
  <nav
    class="public-setup-nav sticky z-40 mb-8 -mx-1 px-1"
    aria-label="Setup pages"
  >
    <div
      class="public-setup-nav__shell inline-flex w-full sm:w-auto items-center gap-1 rounded-full p-1 border"
      :class="isDark
        ? 'bg-white/[0.03] border-white/10'
        : 'bg-white/90 border-brand-100 shadow-sm'"
    >
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="public-setup-nav__link inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
        :class="isActive(link.to)
          ? isDark
            ? 'bg-brand-400/14 text-brand-200'
            : 'bg-brand-50 text-brand-800'
          : isDark
            ? 'text-silver-400 hover:text-white hover:bg-white/[0.05]'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white'"
      >
        <UIcon :name="link.icon" class="w-3.5 h-3.5 opacity-80" />
        {{ link.label }}
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const isDark = useIsDark()

const links = [
  { to: '/guide', label: 'Guide', icon: 'i-heroicons-book-open' },
  { to: '/strings', label: 'Import Strings', icon: 'i-heroicons-bolt' },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>
