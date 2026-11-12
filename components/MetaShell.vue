<template>
  <div class="mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" :class="wide ? 'max-w-6xl' : 'max-w-3xl'">
    <nav v-if="crumbs.length" class="mb-6 text-sm" aria-label="Breadcrumb">
      <ol class="flex flex-wrap gap-x-2 gap-y-1">
        <li v-for="(crumb, index) in crumbs" :key="crumb.to" class="flex items-center gap-2">
          <NuxtLink
            :to="crumb.to"
            class="underline underline-offset-4"
            :class="isDark ? 'text-white' : 'text-gray-950'"
          >{{ crumb.label }}</NuxtLink>
          <span v-if="index < crumbs.length - 1" aria-hidden="true" :class="muted">/</span>
        </li>
      </ol>
    </nav>

    <p class="font-mono text-xs uppercase tracking-[0.16em] mb-3" :class="label">{{ copy.eyebrow }}</p>
    <h1 class="mg-h1" :class="isDark ? 'text-white' : 'text-gray-950'">{{ title }}</h1>
    <p class="mt-3 max-w-xl text-sm leading-relaxed" :class="muted">{{ lead }}</p>

    <slot name="intro" />

    <p v-if="empty" class="mt-8 text-sm" role="status" :class="muted">{{ emptyText }}</p>
    <div class="mt-8">
      <slot />
    </div>

    <p class="mt-12 text-sm border-t pt-6 leading-relaxed" :class="isDark ? 'border-white/10 text-silver-400' : 'border-gray-200 text-gray-600'">
      {{ copy.attribution }}
      {{ copy.alsoSee }}
      <a :href="murlokHref" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4" :class="link">{{ copy.murlokLabel }}<span class="sr-only"> (opens in a new tab)</span></a>,
      <a :href="archonHref" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4" :class="link">{{ copy.archonLabel }}<span class="sr-only"> (opens in a new tab)</span></a>
      <template v-if="icyVeinsHref">
        and
        <a :href="icyVeinsHref" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4" :class="link">{{ copy.icyVeinsLabel }}<span class="sr-only"> (opens in a new tab)</span></a>
      </template>
      {{ copy.alsoSeeAfter }}
      <NuxtLink to="/" class="underline underline-offset-4" :class="link">{{ copy.homeLink }}</NuxtLink>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'

withDefaults(defineProps<{
  title: string
  lead: string
  empty: boolean
  emptyText: string
  murlokHref: string
  archonHref: string
  icyVeinsHref?: string
  crumbs?: Array<{ to: string, label: string }>
  wide?: boolean
}>(), {
  crumbs: () => [],
  icyVeinsHref: '',
  wide: false,
})

const isDark = useIsDark()
const copy = META_COPY
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))
const link = computed(() => (isDark.value ? 'text-white' : 'text-gray-950'))
</script>
