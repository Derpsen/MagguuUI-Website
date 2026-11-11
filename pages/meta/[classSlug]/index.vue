<template>
  <MetaShell
    :title="copy.classTitle(entry.name)"
    :lead="copy.classDescription(entry.name)"
    :empty="empty"
    :empty-text="statusText"
    :murlok-href="murlokClassUrl(entry.slug)"
    :archon-href="archonClassUrl(entry.slug)"
    :crumbs="crumbs"
  >
    <section>
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.popularSpecs }}</h2>
      <ul class="mt-3 space-y-2 text-sm border-t pt-3" :class="rule">
        <li v-for="spec in entry.specs" :key="spec.slug">
          <NuxtLink
            :to="metaSpecPath(entry.slug, spec.slug)"
            class="underline underline-offset-4"
            :style="{ color: metaClassTextColor(entry.slug, isDark) }"
          >{{ spec.name }}</NuxtLink>
        </li>
      </ul>
    </section>
  </MetaShell>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { archonClassUrl, findMetaClass, metaClassTextColor, metaSpecPath, murlokClassUrl } from '~/utils/metaCatalog'

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
  empty: boolean
  unavailable?: boolean
}

const { data } = await useFetch<ClassResponse>(() => `/api/v1/meta/${entry.value!.slug}`)
const empty = computed(() => data.value?.empty !== false || data.value?.unavailable === true)
const statusText = computed(() => data.value?.unavailable ? copy.unavailable : copy.noClassData)
const crumbs = computed(() => [{ to: '/meta', label: copy.indexTitle }])
const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const rule = computed(() => (isDark.value ? 'border-white/10' : 'border-gray-200'))
</script>
