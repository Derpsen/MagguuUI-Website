<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="forever-strings-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WoW Forever</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="strong">Strings</h1>
    <p class="mt-3 text-sm leading-relaxed" :class="muted">
      One WowUp collection installs the addons MagguuUI x Forever is set up for. The
      <NuxtLink to="/strings" class="underline underline-offset-2" :class="link">Retail strings</NuxtLink>
      do not apply to WoW Forever.
    </p>

    <h2 class="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WowUp collection</h2>
    <p class="text-sm leading-relaxed" :class="muted" data-testid="forever-wowup-hint">
      In WowUp 2.24.1 or newer, select your WoW Forever installation before you import the collection.
    </p>
    <template v-if="wowup">
      <textarea :value="wowup.string" readonly rows="4" aria-label="WowUp collection string" data-testid="forever-wowup-string"
        class="mt-4 w-full resize-none border p-3 font-mono text-xs break-all"
        :class="isDark ? 'bg-white/[0.03] border-white/10 text-silver-300' : 'bg-white border-gray-200 text-gray-700'" />
      <button type="button" class="mt-2 text-sm font-semibold" :class="link" data-testid="forever-wowup-copy" @click="copy">
        {{ copied ? 'Copied' : 'Copy string' }}
      </button>
    </template>
    <ForeverComingSoon v-else>The WowUp string is published here once it is available.</ForeverComingSoon>

    <h2 class="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">Included addons</h2>
    <ul class="divide-y text-sm" :class="divider" data-testid="forever-addons">
      <li v-for="name in addons" :key="name" class="py-2.5" :class="strong">{{ name }}</li>
    </ul>
  </article>
</template>

<script setup lang="ts">
import type { ForeverWowup } from '~/utils/foreverWowup'
import { FOREVER_PACK_ADDONS } from '~/utils/foreverWowup'

const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI x Forever strings',
  description: 'WowUp collection for MagguuUI x Forever on World of Warcraft: Forever: EllesmereUI, BigWigs, Northern Sky Raid Tools and 8 more addons.',
  path: '/forever/strings',
})

const { data } = await useFetch<{ data: ForeverWowup | null }>('/api/v1/forever/wowup', { key: 'forever-wowup' })
const wowup = computed(() => data.value?.data ?? null)
// The list is fixed to the verified collection; the names in the string carry provider suffixes.
const addons = FOREVER_PACK_ADDONS

const copied = ref(false)
async function copy() {
  if (!wowup.value) return
  try {
    await navigator.clipboard.writeText(wowup.value.string)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch { /* clipboard blocked: the text area stays selectable */ }
}

const label = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const link = computed(() => isDark.value ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900')
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const divider = computed(() => isDark.value ? 'divide-white/10 border-y border-white/10' : 'divide-gray-200 border-y border-gray-200')
</script>
