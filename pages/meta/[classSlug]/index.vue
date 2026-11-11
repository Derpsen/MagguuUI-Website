<template>
  <MetaShell
    :title="copy.classTitle(entry.name)"
    :lead="copy.classDescription(entry.name)"
    :empty="empty"
    :empty-text="copy.noClassData"
    :murlok-href="murlokClassUrl(entry.slug)"
    :archon-href="archonClassUrl(entry.slug)"
    :crumbs="crumbs"
  >
    <template #intro>
      <MetaFreshness :freshness="freshness" />
    </template>

    <section>
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.popularSpecs }}</h2>
      <MetaPopularityBars :rows="rows" />
    </section>
  </MetaShell>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { archonClassUrl, findMetaClass, metaClassColor, metaClassTextColor, metaSpecPath, murlokClassUrl } from '~/utils/metaCatalog'
import { formatShare, formatSharePercent } from '~/utils/metaFormat'
import type { MetaFreshness, MetaSpecSummary } from '~/utils/metaTypes'
import { wowSpecIcon } from '~/utils/wowSpecs'

const copy = META_COPY
const route = useRoute()
const classSlug = computed(() => String(route.params.classSlug || ''))
const entry = computed(() => findMetaClass(classSlug.value))
if (!entry.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

usePublicPageSeo({
  title: copy.classTitle(entry.value.name),
  description: copy.classDescription(entry.value.name),
  path: `/meta/${entry.value.slug}`,
})

type ClassResponse = {
  data: { snapshot: { specs: MetaSpecSummary[] } | null, fetchedAt: number | null, freshness: MetaFreshness | null } | null
  empty: boolean
}

const { data } = await useFetch<ClassResponse>(() => `/api/v1/meta/${entry.value!.slug}`)
const empty = computed(() => !data.value?.data?.snapshot || data.value.empty || !data.value.data.snapshot.specs.length)
const freshness = computed(() => data.value?.data?.freshness ?? null)
const crumbs = computed(() => [{ to: '/meta', label: copy.indexTitle }])
const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))

const rows = computed(() => {
  const specs = data.value?.data?.snapshot?.specs ?? []
  const slug = entry.value!.slug
  const hex = metaClassColor(slug)
  return specs.map(spec => ({
    key: spec.slug,
    to: metaSpecPath(slug, spec.slug),
    label: spec.name,
    color: metaClassTextColor(slug, isDark.value),
    bar: hex,
    barBorder: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff468',
    percent: formatSharePercent(spec.share),
    percentLabel: formatShare(spec.share),
    n: spec.characterCount,
    icon: wowSpecIcon(entry.value!.name, spec.name),
    faded: spec.belowMinSample,
  }))
})
</script>
