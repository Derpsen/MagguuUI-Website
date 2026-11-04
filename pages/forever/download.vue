<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="forever-download-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WoW Forever</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="strong">Download</h1>

    <template v-if="release">
      <p class="mt-3 text-sm leading-relaxed" :class="muted" data-testid="forever-release">
        Latest release: <strong :class="strong">{{ release.name }}</strong><template v-if="release.publishedAt">, published {{ formatForeverDate(release.publishedAt) }}</template>.
      </p>
      <ul v-if="release.assets.length" class="mt-6 divide-y text-sm" :class="divider">
        <li v-for="a in release.assets" :key="a.url" class="py-3">
          <a :href="a.url" class="font-medium" :class="link" rel="noopener">{{ a.name }}</a>
        </li>
      </ul>
      <p v-if="release.url" class="mt-4 text-sm">
        <a :href="release.url" class="underline underline-offset-2" :class="link" rel="noopener" target="_blank">Release notes on GitHub</a>
      </p>
      <ForeverComingSoon v-if="!release.url && !release.assets.length">Download links follow once the release is public.</ForeverComingSoon>
    </template>
    <ForeverComingSoon v-else>Download available once the first release is published.</ForeverComingSoon>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI x Forever download',
  description: 'Download MagguuUI x Forever for World of Warcraft: Forever. Available once the first release is published.',
  path: '/forever/download',
})

const release = await useForeverRelease()

const label = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const link = computed(() => isDark.value ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900')
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const divider = computed(() => isDark.value ? 'divide-white/10 border-y border-white/10' : 'divide-gray-200 border-y border-gray-200')
</script>
