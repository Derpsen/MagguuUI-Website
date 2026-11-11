<template>
  <MetaShell
    :title="copy.indexTitle"
    :lead="copy.indexLead"
    :empty="false"
    :empty-text="statusText"
    :murlok-href="META_MURLLOK_HOME"
    :archon-href="META_ARCHON_HOME"
  >
    <template #intro>
      <MetaFreshness v-if="freshness" :freshness="freshness" :season="seasonLabel" />
    </template>

    <p v-if="noData" class="text-sm" role="status" :class="tone.muted.value">{{ statusText }}</p>

    <MetaHomeHero :freshness="freshness" cta-href="#classes" />

    <MetaClassPicker id="classes" class="mt-8 scroll-mt-24" />

    <MetaFilterBar class="mt-8" :role="filters.role" :by="filters.by" :season="seasonLabel || '—'" :key-range="keyLabel" />

    <MetaSpecIndex v-if="!noData" class="mt-8" :classes="classes" :role="filters.role" :by="filters.by" />

    <AdSlot v-if="!noData" class="mt-8" placement="index-inline" />

    <section class="mt-10" aria-labelledby="meta-method">
      <h2 id="meta-method" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.methodology }}</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="tone.muted.value">{{ copy.methodologyBody }}</p>
      <p class="mt-2 text-sm leading-relaxed" :class="tone.muted.value">{{ copy.minSample }}</p>
      <p class="mt-2 text-sm font-medium" :class="tone.strong.value">{{ copy.lowPopularity }}</p>
    </section>

    <section class="mt-10" aria-labelledby="meta-faq">
      <h2 id="meta-faq" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.faqTitle }}</h2>
      <dl class="mt-3 space-y-4 text-sm">
        <div v-for="item in faq" :key="item.q">
          <dt class="font-medium" :class="tone.strong.value">{{ item.q }}</dt>
          <dd class="mt-1" :class="tone.muted.value">{{ item.a }}</dd>
        </div>
      </dl>
    </section>
  </MetaShell>
</template>

<script setup lang="ts">
import { META_ARCHON_HOME, META_MURLLOK_HOME } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'
import type { MetaClassSummary, MetaFreshness } from '~/utils/metaTypes'
import { parseMetaIndexQuery } from '~/utils/metaUiCopy'

const copy = META_COPY
const tone = useMetaTone()
const route = useRoute()

usePublicPageSeo({
  title: copy.indexTitle,
  description: copy.indexDescription,
  path: '/meta',
})

type MetaIndexResponse = {
  data: { classes: MetaClassSummary[], freshness: MetaFreshness, season: { id: number, label: string } | null } | null
  catalog?: Array<{ slug: string, label?: string }>
  empty: boolean
  unavailable?: boolean
}

const filters = computed(() => parseMetaIndexQuery(route.query))

const { data } = await useFetch<MetaIndexResponse>('/api/v1/meta')
const classes = computed(() => data.value?.data?.classes ?? [])
const noData = computed(() => !data.value?.data || data.value.empty || data.value.unavailable || !classes.value.length)
const statusText = computed(() => data.value?.unavailable ? copy.unavailable : copy.empty)
const freshness = computed(() => data.value?.data?.freshness ?? null)
const seasonLabel = computed(() => data.value?.data?.season?.label ?? null)
const keyLabel = computed(() => {
  const range = freshness.value?.keyLevels
  if (!range) return '—'
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`
})


const faq = [
  { q: copy.faqSampleQ, a: copy.faqSampleA },
  { q: copy.faqLowPopQ, a: copy.faqLowPopA },
  { q: copy.faqSourceQ, a: copy.faqSourceA },
]
</script>
