<template>
  <MetaShell
    wide
    :title="copy.specTitle(found.classEntry.name, found.spec.name)"
    :lead="copy.specDescription(found.classEntry.name, found.spec.name)"
    :empty="empty"
    :empty-text="statusText"
    :murlok-href="murlokSpecUrl(found.classEntry.slug, found.spec.slug)"
    :archon-href="archonSpecUrl(found.classEntry.slug, found.spec.slug)"
    :icy-veins-href="icyVeinsGuideUrl(found.classEntry.slug, found.spec.slug)"
    :crumbs="crumbs"
  >
    <template #intro>
      <img v-if="specIcon" :src="specIcon" alt="" width="40" height="40" class="mt-4 h-10 w-10" loading="lazy" decoding="async">
      <MetaFreshness :freshness="freshness" :sample-size="spec?.n ?? null" />
      <MetaSpecSwitcher
        class="mt-6"
        :class-slug="found.classEntry.slug"
        :spec-slug="found.spec.slug"
        :hero-split="spec?.heroSplit ?? []"
        :active-hero-id="heroId"
      />
    </template>

    <div v-if="spec && showFigures" class="xl:grid xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-x-[150px] xl:gap-y-10">
      <div class="min-w-0">
        <div
          class="sticky top-14 z-30 -mx-4 mb-8 border-y px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 xl:hidden"
          :class="tone.rule.value"
          style="background: color-mix(in srgb, var(--mg-bg) 94%, transparent)"
        >
          <MetaToc :items="toc" />
        </div>

        <div id="overview" class="scroll-mt-28">
          <p v-if="spec.lowSample" class="mb-4 text-sm font-semibold" role="note" :class="tone.strong.value">
            {{ copy.belowSample }} ({{ spec.n }}). {{ copy.lowPopularity }}
          </p>
          <MetaBuildCard
            :loadouts="loadouts"
            :sample-size="spec.n"
            :key-levels="spec.keyLevels"
            :show-best="!spec.lowSample"
            :empty-text="spec.lowSample ? copy.belowSample : copy.noSpecData"
          />
          <div class="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem]">
            <MetaHeroTrees :hero-split="spec.heroSplit" :loadouts="spec.loadouts" />
            <MetaAtAGlance :spec="spec" />
          </div>
        </div>

        <LazyMetaSpecBelowFold
          hydrate-on-visible
          :spec="spec"
          :talents="talents"
          :class-slug="found.classEntry.slug"
        />
      </div>

      <aside class="hidden xl:block">
        <div class="sticky top-20 space-y-8">
          <MetaToc :items="toc" />
          <AdSlot placement="sidebar" />
        </div>
      </aside>
    </div>

    <MetaClassPicker v-else class="mt-8" :current="found.classEntry.slug" />
  </MetaShell>
</template>

<script setup lang="ts">
import { archonSpecUrl, findMetaSpec, icyVeinsGuideUrl, murlokSpecUrl } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'
import type { MetaFreshness, MetaSpecSummary, MetaTalentGroups } from '~/utils/metaTypes'
import { parseHeroQuery } from '~/utils/metaUiCopy'
import { wowSpecIcon } from '~/utils/wowSpecs'

const copy = META_COPY
const tone = useMetaTone()
const route = useRoute()

const resolved = findMetaSpec(String(route.params.classSlug || ''), String(route.params.specSlug || ''))
if (!resolved) throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
const found = resolved

usePublicPageSeo({
  title: copy.specTitle(found.classEntry.name, found.spec.name),
  description: copy.specDescription(found.classEntry.name, found.spec.name),
  path: `/meta/${found.classEntry.slug}/${found.spec.slug}`,
})

type SpecResponse = {
  data: { snapshot: MetaSpecSummary | null, freshness: MetaFreshness | null } | null
  empty: boolean
  unavailable?: boolean
}

const { data } = await useFetch<SpecResponse>(`/api/v1/meta/${found.classEntry.slug}/${found.spec.slug}`)
const spec = computed(() => data.value?.data?.snapshot ?? null)
const unavailable = computed(() => data.value?.unavailable === true)
const empty = computed(() => unavailable.value || data.value?.empty !== false || !spec.value || spec.value.collecting || spec.value.empty)
const showFigures = computed(() => !!spec.value && !empty.value)
const statusText = computed(() => unavailable.value ? copy.unavailable : copy.noSpecData)
const freshness = computed(() => data.value?.data?.freshness ?? null)
const heroId = computed(() => parseHeroQuery(route.query, spec.value?.heroSplit.map(hero => hero.id) ?? []))
const loadouts = computed(() => {
  const all = spec.value?.loadouts ?? []
  return heroId.value == null ? all : all.filter(loadout => loadout.heroTree?.id === heroId.value)
})
const talents = computed<MetaTalentGroups>(() => {
  const current = spec.value
  if (!current) return { class: [], spec: [], hero: [] }
  if (heroId.value == null) return current.talents
  const split = (current.talentsByHero ?? []).find(group => group.heroTree.id === heroId.value)
  return split?.talents ?? current.talents
})
const specIcon = wowSpecIcon(found.classEntry.name, found.spec.name)
const crumbs = [
  { to: '/meta', label: copy.indexTitle },
  { to: `/meta/${found.classEntry.slug}`, label: found.classEntry.name },
]

const toc = [
  { id: 'overview', label: copy.overview },
  { id: 'talents', label: copy.talents },
  { id: 'stats', label: copy.stats },
  { id: 'gear', label: copy.gear },
  { id: 'trinkets', label: copy.trinkets },
  { id: 'enchants', label: copy.enchantsGems },
  { id: 'races', label: copy.races },
  { id: 'faq', label: copy.faq },
]

</script>
