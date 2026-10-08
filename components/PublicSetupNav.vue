<!--
  Sticky Guide ↔ Import Strings switcher for /guide and /strings.
-->
<template>
  <nav
    class="public-setup-nav sticky z-40 mb-8 -mx-1 px-1"
    aria-label="Setup pages"
  >
    <div
      class="inline-flex items-center gap-5 border-b"
      :class="isDark ? 'border-white/10' : 'border-gray-200'"
    >
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="public-setup-nav__link pb-2 -mb-px border-b-2 text-sm"
        :class="isActive(link.to)
          ? isDark
            ? 'border-brand-300 text-white'
            : 'border-brand-700 text-gray-950'
          : isDark
            ? 'border-transparent text-silver-400 hover:text-white'
            : 'border-transparent text-gray-500 hover:text-gray-950'"
      >
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
