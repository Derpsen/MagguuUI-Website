<template>
  <section class="mt-6 text-sm" aria-labelledby="meta-freshness-label">
    <h2 id="meta-freshness-label" class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.snapshot }}</h2>
    <dl class="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2" :class="muted">
      <div class="flex gap-2">
        <dt class="font-medium" :class="strong">{{ copy.fetched }}</dt>
        <dd class="tabular-nums">{{ fetchedLabel }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="font-medium" :class="strong">{{ copy.sample }}</dt>
        <dd class="tabular-nums">{{ sampleLabel }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="font-medium" :class="strong">{{ copy.keyLevels }}</dt>
        <dd class="tabular-nums">{{ keyLabel }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="font-medium" :class="strong">{{ copy.region }}</dt>
        <dd class="uppercase">{{ regionLabel }}</dd>
      </div>
      <div class="flex gap-2 sm:col-span-2">
        <dt class="font-medium" :class="strong">{{ copy.source }}</dt>
        <dd>{{ copy.sourceValue }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatMetaFetchedAt } from '~/utils/metaSchedule'
import type { MetaFreshness } from '~/utils/metaTypes'

const props = defineProps<{ freshness: MetaFreshness | null }>()
const copy = META_COPY
const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const strong = computed(() => (isDark.value ? 'text-white' : 'text-gray-950'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))

const fetchedLabel = computed(() => {
  if (!props.freshness) return copy.noSnapshot
  return formatMetaFetchedAt(props.freshness.fetchedAt) || copy.noSnapshot
})
const sampleLabel = computed(() => {
  if (!props.freshness) return copy.noSnapshot
  return `${props.freshness.characters} ${copy.characters}`
})
const keyLabel = computed(() => {
  const range = props.freshness?.keyLevels
  if (!range) return '—'
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`
})
const regionLabel = computed(() => (props.freshness?.region || 'eu').toUpperCase())
</script>
