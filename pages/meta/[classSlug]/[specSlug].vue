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

    <div v-if="spec && showFigures" class="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10">
      <div class="min-w-0">
        <div
          class="sticky top-14 z-30 -mx-4 mb-8 border-y px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden"
          :class="tone.isDark.value ? 'border-white/10 bg-[#0b1118]/95' : 'border-gray-200 bg-[#eef4fb]/95'"
        >
          <MetaToc :items="toc" />
        </div>

        <div id="overview" class="scroll-mt-28">
          <p v-if="spec.lowSample" class="mb-4 text-sm font-medium" role="note" :class="tone.strong.value">
            {{ copy.belowSample }} ({{ spec.n }}). {{ copy.lowPopularity }}
          </p>
          <MetaBuildCard
            :loadouts="loadouts"
            :sample-size="spec.n"
            :key-levels="spec.keyLevels"
            :show-best="!spec.lowSample"
            :empty-text="spec.lowSample ? copy.belowSample : copy.noSpecData"
          />
          <AdSlot class="mt-8" placement="after-build" />
          <div class="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem]">
            <MetaHeroTrees :hero-split="spec.heroSplit" :loadouts="spec.loadouts" />
            <MetaAtAGlance :spec="spec" />
          </div>
        </div>

        <MetaTalentHeatmap id="talents" class="mt-12 scroll-mt-28" :talents="talents" />

        <AdSlot class="mt-12" placement="between-sections" />

        <section id="stats" class="mt-12 scroll-mt-28" aria-labelledby="meta-stats-h">
          <h2 id="meta-stats-h" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.stats }}</h2>
          <p class="mt-2 text-sm font-medium" :class="tone.strong.value">{{ copy.statPrio }}</p>
          <ul class="mt-3 border-t" :class="tone.rule.value">
            <li v-for="stat in spec.stats" :key="stat.id" class="flex items-center gap-3 border-b py-2 text-sm" :class="tone.rule.value">
              <span class="w-36 shrink-0" :class="tone.strong.value">{{ stat.label }}</span>
              <MetaBar class="flex-1" :percent="statPercent(stat.average)" :label="`${stat.label}: ${stat.average}`" />
              <span class="w-16 shrink-0 text-right tabular-nums" :class="tone.muted.value">{{ stat.average }}</span>
            </li>
          </ul>
          <p class="mt-2 text-xs leading-relaxed" :class="tone.muted.value">{{ copy.statBias }}</p>
        </section>

        <MetaGearSlots id="gear" class="mt-12 scroll-mt-28" :gear-slots="spec.gearSlots" :rings="spec.rings" :trinkets="spec.trinkets" />

        <MetaGearSlots
          v-if="spec.embellishments.length"
          class="mt-8"
          :title="copy.embellishments"
          :gear-slots="[{ slot: 'EMBELLISHMENTS', items: spec.embellishments }]"
        />

        <section id="enchants" class="mt-12 scroll-mt-28" aria-labelledby="meta-ench-h">
          <h2 id="meta-ench-h" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.enchantsGems }}</h2>
          <div class="mt-4 grid gap-6 md:grid-cols-2">
            <div v-for="list in enchantLists" :key="list.title">
              <h3 class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ list.title }}</h3>
              <ul class="mt-2 border-t" :class="tone.rule.value">
                <li v-for="row in list.rows" :key="row.id" class="flex justify-between gap-2 border-b py-1.5 text-sm" :class="tone.rule.value">
                  <span :class="tone.strong.value">{{ row.label }}</span>
                  <span class="tabular-nums" :class="tone.muted.value">{{ formatShare(row.share) }} · {{ row.count }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="races" class="mt-12 scroll-mt-28" aria-labelledby="meta-race-h">
          <h2 id="meta-race-h" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.races }}</h2>
          <ul class="mt-3 border-t" :class="tone.rule.value">
            <li v-for="race in spec.races" :key="race.id" class="flex items-center gap-3 border-b py-2 text-sm" :class="tone.rule.value">
              <span class="w-36 shrink-0" :class="tone.strong.value">{{ race.label }}</span>
              <MetaBar class="flex-1" :percent="formatSharePercent(race.share)" :label="`${race.label}: ${formatShare(race.share)}`" />
              <span class="w-20 shrink-0 text-right tabular-nums" :class="tone.muted.value">{{ formatShare(race.share) }}</span>
            </li>
          </ul>
        </section>

        <MetaClassPicker class="mt-12" :current="found.classEntry.slug" />

        <section id="faq" class="mt-12 scroll-mt-28" aria-labelledby="meta-faq-h">
          <h2 id="meta-faq-h" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.faq }}</h2>
          <p class="mt-3 text-sm leading-relaxed" :class="tone.muted.value">{{ copy.methodologyBody }}</p>
          <p class="mt-2 text-sm leading-relaxed" :class="tone.muted.value">{{ copy.minSample }}</p>
          <dl class="mt-4 space-y-4 text-sm">
            <div v-for="item in faq" :key="item.q">
              <dt class="font-medium" :class="tone.strong.value">{{ item.q }}</dt>
              <dd class="mt-1" :class="tone.muted.value">{{ item.a }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <aside class="hidden lg:block">
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
import { formatShare, formatSharePercent } from '~/utils/metaFormat'
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

const enchantLists = computed(() => [
  { title: copy.enchants, rows: spec.value?.enchants ?? [] },
  { title: copy.gems, rows: spec.value?.gems ?? [] },
])

const faq = [
  { q: copy.faqSampleQ, a: copy.faqSampleA },
  { q: copy.faqLowPopQ, a: copy.faqLowPopA },
  { q: copy.faqSourceQ, a: copy.faqSourceA },
]

function statPercent(average: number) {
  const max = Math.max(1, ...(spec.value?.stats.map(stat => stat.average) ?? [1]))
  return Math.round((average / max) * 100)
}
</script>
