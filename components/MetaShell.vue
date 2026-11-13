<template>
  <div class="mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" :class="wide ? 'max-w-6xl' : 'max-w-3xl'">
    <nav v-if="crumbs.length" class="mb-6 text-sm" aria-label="Breadcrumb">
      <ol class="flex flex-wrap gap-x-2 gap-y-1">
        <li v-for="(crumb, index) in crumbs" :key="crumb.to" class="flex items-center gap-2">
          <NuxtLink
            :to="crumb.to"
            class="text-mg-fg underline underline-offset-4"
          >{{ crumb.label }}</NuxtLink>
          <span v-if="index < crumbs.length - 1" aria-hidden="true" class="text-mg-fg-subtle">/</span>
        </li>
      </ol>
    </nav>

    <p class="mg-kicker mb-3">{{ copy.eyebrow }}</p>
    <h1 class="mg-h1">{{ title }}</h1>
    <p class="mg-lead mt-3 max-w-xl">{{ lead }}</p>

    <slot name="intro" />

    <p v-if="empty" class="mt-8 text-sm text-mg-fg-muted" role="status">{{ emptyText }}</p>
    <div class="mt-8">
      <slot />
    </div>

    <p class="mt-12 border-t border-mg-line pt-6 text-sm leading-relaxed text-mg-fg-muted">
      {{ copy.attribution }}
      {{ copy.alsoSee }}
      <a :href="murlokHref" target="_blank" rel="noopener noreferrer" class="text-mg-fg underline underline-offset-4">{{ copy.murlokLabel }}<span class="sr-only"> (opens in a new tab)</span></a>,
      <a :href="archonHref" target="_blank" rel="noopener noreferrer" class="text-mg-fg underline underline-offset-4">{{ copy.archonLabel }}<span class="sr-only"> (opens in a new tab)</span></a>
      <template v-if="icyVeinsHref">
        and
        <a :href="icyVeinsHref" target="_blank" rel="noopener noreferrer" class="text-mg-fg underline underline-offset-4">{{ copy.icyVeinsLabel }}<span class="sr-only"> (opens in a new tab)</span></a>
      </template>
      {{ copy.alsoSeeAfter }}
      <NuxtLink to="/" class="text-mg-fg underline underline-offset-4">{{ copy.homeLink }}</NuxtLink>.
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

const copy = META_COPY
</script>
