<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="forever-guide-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">WoW Forever</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Guide</h1>
    <ForeverComingSoon>
      The setup guide for MagguuUI x Forever follows with the first release. The
      <NuxtLink to="/guide" class="underline underline-offset-2" :class="isDark ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900'">Retail guide</NuxtLink>
      does not apply to WoW Forever.
    </ForeverComingSoon>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI x Forever guide',
  description: 'Setup guide for MagguuUI x Forever on World of Warcraft: Forever. Coming with the first release.',
  path: '/forever/guide',
})
</script>
