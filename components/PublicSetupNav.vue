<!--
  Sticky Guide ↔ Import Strings ↔ Configurator switcher for /guide and /strings. Tokens only (assets/css/setup.css).
-->
<template>
  <nav class="public-setup-nav sticky z-40 mb-8" aria-label="Setup pages">
    <div class="public-setup-nav__list">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="public-setup-nav__link"
        :class="{ 'is-active': isActive(link.to) }"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/guide', label: 'Guide' },
  { to: '/strings', label: 'Import Strings' },
  { to: '/configurator', label: 'Configurator' },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>
