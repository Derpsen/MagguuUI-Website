<template>
  <article class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20" data-testid="forever-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WoW Forever</p>
    <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight" :class="strong">MagguuUI x Forever</h1>
    <p class="mt-4 max-w-2xl text-base leading-relaxed" :class="muted">
      A standalone addon for World of Warcraft: Forever, built on EllesmereUI. It is a separate product from MagguuUI for Retail
      and is in development.
    </p>

    <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14 items-start">
    <dl class="divide-y text-sm" :class="divider">
      <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
        <dt :class="faint">Game</dt>
        <dd class="text-right" :class="strong">
          World of Warcraft: Forever, live from 5 November 2026, 00:00 CET
          (<a href="https://news.blizzard.com/en-us/article/24315820/world-of-warcraft-forever-goes-live-globally-november-4" class="underline underline-offset-2" :class="link" rel="noopener" target="_blank">Blizzard</a>)
        </dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
        <dt :class="faint">Based on</dt>
        <dd :class="strong">EllesmereUI</dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
        <dt :class="faint">Client interface</dt>
        <dd :class="strong">16001</dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
        <dt :class="faint">In game</dt>
        <dd :class="strong"><code>/muif</code></dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
        <dt :class="faint">Distribution</dt>
        <dd :class="strong">Not on CurseForge</dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3" data-testid="forever-release-state">
        <dt :class="faint">Release</dt>
        <dd v-if="release" :class="strong">{{ release.version }}<template v-if="release.publishedAt">, {{ formatForeverDate(release.publishedAt) }}</template></dd>
        <dd v-else :class="strong">Not published yet</dd>
      </div>
    </dl>

    <div>
    <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">Sections</h2>
    <ul class="divide-y text-sm" :class="divider">
      <li v-for="s in sections" :key="s.to" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
        <NuxtLink :to="s.to" class="font-medium" :class="link">{{ s.label }}</NuxtLink>
        <span :class="faint">{{ s.state }}</span>
      </li>
    </ul>
    </div>
    </div>

    <section class="mt-14 pt-10 border-t" :class="isDark ? 'border-white/10' : 'border-gray-200'" aria-labelledby="forever-next" data-testid="forever-next-step">
      <h2 id="forever-next" class="home-h2" :class="strong">Playing Retail today?</h2>
      <p class="mt-2 text-sm max-w-xl leading-relaxed" :class="muted">
        MagguuUI for Retail is released and unchanged. Get it now, or read what changed in the latest version.
      </p>
      <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <DownloadButtons primary label="Download MagguuUI for Retail" />
        <NuxtLink to="/changelog" class="text-sm font-medium underline underline-offset-4" :class="link">Retail changelog</NuxtLink>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI x Forever',
  description: 'MagguuUI x Forever is a standalone addon for World of Warcraft: Forever, built on EllesmereUI. In development.',
  path: '/forever',
})

const release = await useForeverRelease()
const { data: wowupData } = await useFetch<{ data: { string: string } | null }>('/api/v1/forever/wowup', { key: 'forever-wowup' })
const wowup = computed(() => wowupData.value?.data ?? null)

const sections = computed(() => [
  { to: '/forever/guide', label: 'Guide', state: 'Coming soon' },
  { to: '/forever/download', label: 'Download', state: release.value ? release.value.version : 'Coming soon' },
  { to: '/forever/strings', label: 'Strings', state: wowup.value ? 'WowUp collection, 11 addons' : 'Addon list, string coming soon' },
])

const label = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const link = computed(() => isDark.value ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900')
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const faint = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const divider = computed(() => isDark.value ? 'divide-white/10 border-y border-white/10' : 'divide-gray-200 border-y border-gray-200')
</script>
