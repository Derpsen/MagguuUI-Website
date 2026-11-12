<template>
  <section class="mt-6 border-l-2 pl-4 text-sm" :class="tone.isDark.value ? 'border-brand-400' : 'border-brand-600'" :aria-labelledby="headingId">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.snapshot }}</h2>
    <dl class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2" :class="tone.muted.value">
      <div v-for="row in rows" :key="row.label" class="flex gap-2" :class="row.wide ? 'sm:col-span-2' : ''">
        <dt class="font-medium" :class="tone.strong.value">{{ row.label }}</dt>
        <dd class="tabular-nums">
          <time v-if="row.datetime" :datetime="row.datetime">{{ row.value }}</time>
          <template v-else>{{ row.value }}</template>
        </dd>
      </div>
    </dl>
    <p v-if="freshness?.partial" class="mt-2 text-xs font-medium" role="note" :class="tone.isDark.value ? 'text-amber-300' : 'text-amber-800'">
      {{ copy.partialNote }}
    </p>
    <p v-if="stale" class="mt-2 text-xs font-medium" role="note" :class="tone.isDark.value ? 'text-amber-300' : 'text-amber-800'">
      This snapshot is older than {{ staleAfterDays }} days and may not reflect the current patch.
    </p>
  </section>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatMetaFetchedAt } from '~/utils/metaSchedule'
import type { MetaFreshness } from '~/utils/metaTypes'
import { metaFetchedAtMs } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  freshness: MetaFreshness | null
  season?: string | null
  sampleSize?: number | null
  staleAfterDays?: number
  now?: number
}>(), { season: null, sampleSize: null, staleAfterDays: 3, now: undefined })

const copy = META_COPY
const tone = useMetaTone()
const headingId = `meta-fresh-${useId()}`
const freshness = computed(() => props.freshness)

const rows = computed(() => {
  const freshness = props.freshness
  if (!freshness) return [{ label: copy.fetched, value: copy.noSnapshot, datetime: '', wide: true }]
  const keys = freshness.keyLevels
    ? (freshness.keyLevels.min === freshness.keyLevels.max ? String(freshness.keyLevels.min) : `${freshness.keyLevels.min}–${freshness.keyLevels.max}`)
    : '—'
  const n = props.sampleSize ?? freshness.players
  return [
    { label: copy.fetched, value: formatMetaFetchedAt(freshness.fetchedAt) || copy.noSnapshot, datetime: new Date(metaFetchedAtMs(freshness.fetchedAt)).toISOString(), wide: false },
    { label: copy.sample, value: `${n} ${copy.characters}`, datetime: '', wide: false },
    { label: copy.keyLevels, value: keys, datetime: '', wide: false },
    { label: copy.region, value: freshness.region.toUpperCase(), datetime: '', wide: false },
    ...(props.season ? [{ label: copy.season, value: props.season, datetime: '', wide: false }] : []),
    { label: copy.source, value: copy.sourceValue, datetime: '', wide: true },
  ]
})

const stale = computed(() => {
  const freshness = props.freshness
  if (!freshness) return false
  const now = props.now ?? Date.now()
  return now - metaFetchedAtMs(freshness.fetchedAt) > props.staleAfterDays * 86_400_000
})
</script>
