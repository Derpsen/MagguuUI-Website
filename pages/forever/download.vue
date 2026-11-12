<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="forever-download-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WoW Forever</p>
    <h1 class="mg-h1" :class="strong">Download</h1>
    <p class="mt-3 text-sm leading-relaxed" :class="muted" data-testid="forever-download-copy">
      Forever ships inside the MagguuUI package (CurseForge project 1457810). Install the same zip into your Forever AddOns folder. There is no separate Forever archive on CurseForge.
    </p>
    <DownloadButtons primary class="mt-6" label="Download MagguuUI" />
    <p class="mt-6 text-sm" :class="muted">
      After install, open
      <NuxtLink to="/forever/guide" class="underline underline-offset-2" :class="link">the Forever guide</NuxtLink>
      or copy the
      <NuxtLink to="/forever/strings" class="underline underline-offset-2" :class="link">WowUp packs</NuxtLink>.
    </p>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI Forever download',
  description: 'Download MagguuUI for World of Warcraft: Forever. Same package as Retail on CurseForge, Wago and WoWInterface.',
  path: '/forever/download',
})

const label = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const link = computed(() => isDark.value ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900')
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
</script>
