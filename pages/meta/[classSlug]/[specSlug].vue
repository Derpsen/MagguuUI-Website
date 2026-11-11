<template>
  <MetaShell
    :title="copy.specTitle(found.classEntry.name, found.spec.name)"
    :lead="copy.specDescription(found.classEntry.name, found.spec.name)"
    :empty="empty"
    :empty-text="statusText"
    :murlok-href="murlokSpecUrl(found.classEntry.slug, found.spec.slug)"
    :archon-href="archonSpecUrl(found.classEntry.slug, found.spec.slug)"
    :icy-veins-href="icyVeinsGuideUrl(found.classEntry.slug, found.spec.slug)"
    :crumbs="crumbs"
  />
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { archonSpecUrl, findMetaSpec, icyVeinsGuideUrl, murlokSpecUrl } from '~/utils/metaCatalog'

const copy = META_COPY
const route = useRoute()
const found = computed(() => findMetaSpec(String(route.params.classSlug || ''), String(route.params.specSlug || '')))
if (!found.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

usePublicPageSeo({
  title: copy.specTitle(found.value.classEntry.name, found.value.spec.name),
  description: copy.specDescription(found.value.classEntry.name, found.value.spec.name),
  path: `/meta/${found.value.classEntry.slug}/${found.value.spec.slug}`,
})

type SpecResponse = {
  empty: boolean
  unavailable?: boolean
}

const { data } = await useFetch<SpecResponse>(() => `/api/v1/meta/${found.value!.classEntry.slug}/${found.value!.spec.slug}`)
const empty = computed(() => data.value?.empty !== false || data.value?.unavailable === true)
const statusText = computed(() => data.value?.unavailable ? copy.unavailable : copy.noSpecData)
const crumbs = computed(() => [
  { to: '/meta', label: copy.indexTitle },
  { to: `/meta/${found.value!.classEntry.slug}`, label: found.value!.classEntry.name },
])
</script>
