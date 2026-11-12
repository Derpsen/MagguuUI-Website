<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="forever-strings-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WoW Forever</p>
    <h1 class="mg-h1" :class="strong">Strings</h1>
    <p class="mt-3 text-sm leading-relaxed" :class="muted">
      Forever WowUp packs install the addons MagguuUI sets up on Forever. The
      <NuxtLink to="/strings" class="underline underline-offset-2" :class="link">Retail strings</NuxtLink>
      do not apply to WoW Forever.
    </p>

    <p class="mt-6 text-sm leading-relaxed" :class="muted" data-testid="forever-wowup-hint">
      In WowUp 2.24.1 or newer, select your WoW Forever installation before you import a collection.
    </p>

    <section class="mt-10" data-testid="forever-starter">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">Starter ({{ FOREVER_STARTER_ADDONS.length }})</h2>
      <template v-if="starter">
        <textarea :value="starter.string" readonly rows="4" aria-label="Forever WowUp starter string" data-testid="forever-wowup-string"
          class="w-full resize-none border p-3 font-mono text-xs break-all"
          :class="isDark ? 'bg-white/[0.03] border-white/10 text-silver-300' : 'bg-white border-gray-200 text-gray-700'" />
        <button type="button" class="mt-2 text-sm font-semibold" :class="link" data-testid="forever-wowup-copy" @click="copy('starter')">
          {{ copied === 'starter' ? 'Copied' : 'Copy starter' }}
        </button>
      </template>
      <ForeverComingSoon v-else>The Forever starter string is published here once MagguuUI Camelot WowUp.lua is readable.</ForeverComingSoon>
      <ul class="mt-4 divide-y text-sm" :class="divider" data-testid="forever-addons-starter">
        <li v-for="name in FOREVER_STARTER_ADDONS" :key="name" class="py-2.5" :class="strong">{{ name }}</li>
      </ul>
    </section>

    <section class="mt-10" data-testid="forever-optional">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">Optional ({{ FOREVER_OPTIONAL_ADDONS.length }})</h2>
      <template v-if="optional">
        <textarea :value="optional.string" readonly rows="4" aria-label="Forever WowUp optional string" data-testid="forever-wowup-optional-string"
          class="w-full resize-none border p-3 font-mono text-xs break-all"
          :class="isDark ? 'bg-white/[0.03] border-white/10 text-silver-300' : 'bg-white border-gray-200 text-gray-700'" />
        <button type="button" class="mt-2 text-sm font-semibold" :class="link" data-testid="forever-wowup-optional-copy" @click="copy('optional')">
          {{ copied === 'optional' ? 'Copied' : 'Copy optional' }}
        </button>
      </template>
      <ForeverComingSoon v-else>The Forever optional string is published here once MagguuUI Camelot WowUp.lua is readable.</ForeverComingSoon>
      <ul class="mt-4 divide-y text-sm" :class="divider" data-testid="forever-addons-optional">
        <li v-for="name in FOREVER_OPTIONAL_ADDONS" :key="name" class="py-2.5" :class="strong">{{ name }}</li>
      </ul>
    </section>

    <!-- Combined list for tests that count the verified pack -->
    <ul class="sr-only" data-testid="forever-addons" aria-hidden="true">
      <li v-for="name in FOREVER_PACK_ADDONS" :key="name">{{ name }}</li>
    </ul>
  </article>
</template>

<script setup lang="ts">
import type { ForeverWowup, ForeverWowupPacks } from '~/utils/foreverWowup'
import { FOREVER_OPTIONAL_ADDONS, FOREVER_PACK_ADDONS, FOREVER_STARTER_ADDONS } from '~/utils/foreverWowup'

const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI Forever strings',
  description: 'WowUp Starter and Optional packs for MagguuUI on World of Warcraft: Forever.',
  path: '/forever/strings',
})

const { data } = await useFetch<{ data: ForeverWowupPacks | null }>('/api/v1/forever/wowup', { key: 'forever-wowup' })
const starter = computed(() => data.value?.data?.starter ?? null)
const optional = computed(() => data.value?.data?.optional ?? null)

const copied = ref<'starter' | 'optional' | null>(null)
async function copy(which: 'starter' | 'optional') {
  const row: ForeverWowup | null = which === 'starter' ? starter.value : optional.value
  if (!row) return
  try {
    await navigator.clipboard.writeText(row.string)
    copied.value = which
    setTimeout(() => { copied.value = null }, 1800)
  } catch { /* clipboard blocked */ }
}

const label = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const link = computed(() => isDark.value ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900')
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const divider = computed(() => isDark.value ? 'divide-white/10 border-y border-white/10' : 'divide-gray-200 border-y border-gray-200')
</script>
