<!--
  AddonCard — Single addon card for the /addons grid.
  Displays emoji, display name, category badge, profile count, and a CTA link.
-->

<template>
  <article class="feature-card rounded-2xl p-5 flex flex-col gap-4 group">
    <!-- Header row: icon + badge -->
    <div class="flex items-start justify-between gap-3">
      <span
        class="inline-flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 text-xl select-none"
        :class="card.isCore
          ? (isDark ? 'bg-brand-400/10 text-brand-300' : 'bg-blue-50 text-blue-600')
          : (isDark ? 'bg-white/[0.04] text-silver-300' : 'bg-gray-50 text-gray-500')"
        :aria-label="card.displayName + ' icon'"
        role="img"
      >{{ card.emoji }}</span>

      <!-- Category badge -->
      <span
        class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5"
        :class="card.isCore
          ? (isDark ? 'bg-brand-400/10 text-brand-300 border border-brand-400/20' : 'bg-blue-50 text-blue-700 border border-blue-200')
          : (isDark ? 'bg-white/[0.04] text-silver-400 border border-white/[0.08]' : 'bg-gray-100 text-gray-500 border border-gray-200')"
      >
        <span
          class="w-1.5 h-1.5 rounded-full inline-block"
          :class="card.isCore ? 'bg-brand-400' : 'bg-silver-400'"
        ></span>
        {{ card.isCore ? 'Core' : 'Optional' }}
      </span>
    </div>

    <!-- Name + profile count -->
    <div class="flex-1">
      <h3
        class="font-semibold text-base leading-snug mb-1 transition-colors duration-200 group-hover:text-brand-400"
        :class="isDark ? 'text-white' : 'text-gray-900'"
      >{{ card.displayName }}</h3>
      <p
        class="text-xs"
        :class="isDark ? 'text-silver-500' : 'text-gray-400'"
      >
        <template v-if="card.profileCount > 0">
          {{ card.profileCount }} curated {{ card.profileCount === 1 ? 'profile' : 'profiles' }}
        </template>
        <template v-else>
          No profiles yet
        </template>
      </p>
    </div>

    <!-- CTA -->
    <NuxtLink
      :to="card.stringsLink"
      class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border"
      :class="card.isCore
        ? (isDark
          ? 'bg-brand-400/10 text-brand-300 border-brand-400/20 hover:bg-brand-400/18 hover:border-brand-400/35'
          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300')
        : (isDark
          ? 'bg-white/[0.04] text-silver-300 border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.14]'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300')"
    >
      View profiles
      <svg aria-hidden="true" class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </NuxtLink>
  </article>
</template>

<script setup lang="ts">
interface AddonCardData {
  apiKey: string
  displayName: string
  emoji: string
  profileCount: number
  isCore: boolean
  stringsLink: string
}

defineProps<{
  card: AddonCardData
  isDark: boolean
}>()
</script>
