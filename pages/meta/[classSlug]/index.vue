<template>
  <MetaShell
    :title="copy.classTitle(found.name)"
    :lead="copy.classDescription(found.name)"
    :empty="empty"
    :empty-text="statusText"
    :murlok-href="murlokClassUrl(found.slug)"
    :archon-href="archonClassUrl(found.slug)"
    :crumbs="crumbs"
  >
    <template #intro>
      <MetaFreshness v-if="freshness" :freshness="freshness" :sample-size="snapshot?.n ?? null" />
    </template>

    <section>
      <h2 class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.popularSpecs }}</h2>
      <ul class="mt-3 space-y-2 border-t pt-3 text-sm" :class="tone.rule.value">
        <li v-for="spec in found.specs" :key="spec.slug">
          <NuxtLink
            :to="metaSpecPath(found.slug, spec.slug)"
            class="underline underline-offset-4"
            :style="{ color: metaClassTextColor(found.slug, tone.isDark.value) }"
          >{{ spec.name }}</NuxtLink>
          <span v-if="specNote(spec.slug)" class="ml-2 font-mono text-xs uppercase tracking-[0.12em]" :class="tone.muted.value">{{ specNote(spec.slug) }}</span>
        </li>
      </ul>
    </section>

    <MetaClassPicker class="mt-10" :current="found.slug" />
  </MetaShell>
</template>

<script setup lang="ts">
import { archonClassUrl, findMetaClass, metaClassTextColor, metaSpecPath, murlokClassUrl } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'
import type { MetaClassSummary, MetaFreshness } from '~/utils/metaTypes'
import { META_UI_COPY } from '~/utils/metaUiCopy'

const copy = META_COPY
const tone = useMetaTone()
const route = useRoute()
const resolved = findMetaClass(String(route.params.classSlug || ''))
if (!resolved) {
  throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
}
const found = resolved

usePublicPageSeo({
  title: copy.classTitle(found.name),
  description: copy.classDescription(found.name),
  path: `/meta/${found.slug}`,
})

type ClassResponse = {
  data: { snapshot: MetaClassSummary | null, freshness: MetaFreshness | null } | null
  empty: boolean
  unavailable?: boolean
}

const { data } = await useFetch<ClassResponse>(`/api/v1/meta/${found.slug}`)
const snapshot = computed(() => data.value?.data?.snapshot ?? null)
const freshness = computed(() => data.value?.data?.freshness ?? null)
const empty = computed(() => data.value?.empty !== false || data.value?.unavailable === true)
const statusText = computed(() => data.value?.unavailable ? copy.unavailable : copy.noClassData)
const crumbs = [{ to: '/meta', label: copy.indexTitle }]

function specNote(slug: string) {
  const spec = snapshot.value?.specs.find(item => item.slug === slug)
  if (!spec) return ''
  if (spec.collecting || spec.empty) return copy.empty
  if (spec.lowSample) return META_UI_COPY.lowSample
  return ''
}
</script>
