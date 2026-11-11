<template>
  <MetaShell
    :title="copy.specTitle(found.classEntry.name, found.spec.name)"
    :lead="copy.specDescription(found.classEntry.name, found.spec.name)"
    :empty="empty"
    :empty-text="copy.noSpecData"
    :murlok-href="murlokSpecUrl(found.classEntry.slug, found.spec.slug)"
    :archon-href="archonSpecUrl(found.classEntry.slug, found.spec.slug)"
    :icy-veins-href="icyVeinsGuideUrl(found.classEntry.slug, found.spec.slug)"
    :crumbs="crumbs"
  >
    <template #intro>
      <div v-if="specIcon" class="mt-4">
        <img :src="specIcon" alt="" width="40" height="40" class="w-10 h-10" loading="lazy" decoding="async">
      </div>
      <MetaFreshness :freshness="freshness" />
    </template>

    <nav
      class="sticky top-14 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-8 overflow-x-auto border-y backdrop-blur-md"
      :class="isDark ? 'bg-[#0b1118]/95 border-white/10' : 'bg-[#eef4fb]/95 border-gray-200'"
      aria-label="On this page"
    >
      <ul class="flex gap-4 text-sm whitespace-nowrap">
        <li v-for="item in toc" :key="item.id">
          <a
            :href="'#' + item.id"
            class="font-mono text-[11px] uppercase tracking-[0.14em]"
            :class="item.id === activeId ? (isDark ? 'text-brand-300' : 'text-brand-700') : muted"
          >{{ item.label }}</a>
        </li>
      </ul>
    </nav>

    <section id="overview">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.bestBuild }}</h2>
      <div v-if="topBuild" class="mt-4 border-t pt-4" :class="rule">
        <p class="text-sm" :class="muted">{{ formatShare(topBuild.share) }} {{ copy.talentPopularity }}</p>
        <dl class="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div class="flex gap-2">
            <dt :class="strong">{{ copy.maxKey }}</dt>
            <dd class="tabular-nums">{{ maxKeyLabel }}</dd>
          </div>
          <div class="flex gap-2">
            <dt :class="strong">{{ copy.talentPopularity }}</dt>
            <dd class="tabular-nums">{{ formatShare(topBuild.share) }}</dd>
          </div>
          <div class="flex gap-2">
            <dt :class="strong">{{ copy.sample }}</dt>
            <dd class="tabular-nums">{{ snapshot?.characterCount ?? 0 }} {{ copy.characters }}</dd>
          </div>
        </dl>
        <div class="mt-4">
          <MetaLoadoutCopy :code="topBuild.code" :copy-label="copy.copyBuild" :copy-label-copied="copy.copied" />
        </div>
        <details v-if="altBuilds.length" class="mt-4">
          <summary class="text-sm underline underline-offset-4 cursor-pointer" :class="strong">{{ copy.viewMore }} — {{ copy.alternatives }}</summary>
          <ul class="mt-3 space-y-3">
            <li v-for="build in altBuilds" :key="build.code" class="text-sm border-t pt-3" :class="rule">
              <p class="tabular-nums" :class="muted">{{ formatShare(build.share) }} · {{ build.count }} {{ copy.parses }}</p>
              <pre class="mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono" :class="muted">{{ build.code }}</pre>
            </li>
          </ul>
        </details>
      </div>
      <p v-else class="mt-4 text-sm" :class="muted">{{ copy.noSpecData }}</p>

      <div v-if="statParts.length" class="mt-6">
        <h3 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.statPriority }}</h3>
        <p class="mt-2 text-sm" :class="strong">
          <template v-for="part in statParts" :key="part.name">
            <span>{{ part.name }}</span>
            <span v-if="part.symbol" class="mx-1.5" :class="muted" aria-hidden="true">{{ part.symbol }}</span>
          </template>
        </p>
        <p class="mt-2 text-xs leading-relaxed" :class="muted">{{ copy.statBias }}</p>
      </div>

      <div v-if="snapshot?.heroSplit.length" class="mt-6">
        <h3 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.heroSplit }}</h3>
        <ul class="mt-3 border-t" :class="rule">
          <li v-for="hero in snapshot.heroSplit" :key="hero.id" class="flex items-center gap-3 py-2 border-b text-sm" :class="rule">
            <span class="flex-1" :class="strong">{{ hero.name }}</span>
            <MetaShareBar :percent="formatSharePercent(hero.share)" :label="formatShare(hero.share)" />
            <span class="tabular-nums text-xs w-16 text-right" :class="muted">{{ hero.count }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section id="talents" class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.talents }}</h2>
      <div class="mt-4 grid gap-6 md:grid-cols-3">
        <div v-for="tree in talentTrees" :key="tree.id">
          <h3 class="font-mono text-[11px] uppercase tracking-[0.14em] border-b pb-2" :class="[label, rule]">{{ tree.title }}</h3>
          <ul class="mt-2">
            <li v-for="talent in tree.talents" :key="talent.id" class="py-1.5 border-b text-sm" :class="rule">
              <div class="flex items-baseline justify-between gap-2">
                <a
                  :href="wowheadSpellUrl(talent.id)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline underline-offset-4"
                  :class="strong"
                  :title="talent.name + ' — ' + bandLabel(talent.band) + ', ' + formatShare(talent.share)"
                >{{ talent.name }}<span class="sr-only"> (opens in a new tab)</span></a>
                <span class="tabular-nums text-xs shrink-0" :class="muted">{{ talent.count }} · {{ formatShare(talent.share) }}</span>
              </div>
              <p class="font-mono text-[10px] uppercase tracking-[0.12em] mt-0.5" :class="label">{{ bandLabel(talent.band) }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section id="stats" class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.stats }}</h2>
      <p class="mt-2 text-sm font-medium" :class="strong">{{ copy.statPrio }}</p>
      <ul class="mt-3 border-t" :class="rule">
        <li v-for="stat in snapshot?.stats ?? []" :key="stat.id" class="flex items-center gap-3 py-2 border-b text-sm" :class="rule">
          <span class="w-36" :class="strong">{{ stat.name }}</span>
          <MetaShareBar :percent="statBarPercent(stat.average)" :label="String(stat.average)" />
        </li>
      </ul>
      <p class="mt-2 text-xs leading-relaxed" :class="muted">{{ copy.statBias }}</p>
    </section>

    <section id="gear" class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.gear }}</h2>
      <div class="mt-4 grid gap-x-8 md:grid-cols-2">
        <ul>
          <li v-for="row in leftSlots" :key="row.slot" class="border-t py-3" :class="rule">
            <MetaGearRow :item="row.item" :alts="row.alts" align="left" />
          </li>
        </ul>
        <ul>
          <li
            v-for="row in rightSlots"
            :id="row.anchor || undefined"
            :key="row.slot"
            class="border-t py-3"
            :class="rule"
          >
            <MetaGearRow :item="row.item" :alts="row.alts" align="right" />
          </li>
        </ul>
      </div>
    </section>

    <section id="enchants" class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.enchantsGems }}</h2>
      <div class="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.enchants }}</h3>
          <ul class="mt-2 border-t" :class="rule">
            <li v-for="row in snapshot?.enchants ?? []" :key="'e-' + row.id" class="flex justify-between gap-2 py-1.5 border-b text-sm" :class="rule">
              <span :class="strong">{{ row.name }}</span>
              <span class="tabular-nums" :class="muted">{{ formatShare(row.share) }} · {{ row.count }}</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.gems }}</h3>
          <ul class="mt-2 border-t" :class="rule">
            <li v-for="row in snapshot?.gems ?? []" :key="'g-' + row.id" class="flex justify-between gap-2 py-1.5 border-b text-sm" :class="rule">
              <span :class="strong">{{ row.name }}</span>
              <span class="tabular-nums" :class="muted">{{ formatShare(row.share) }} · {{ row.count }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section id="races" class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.races }}</h2>
      <ul class="mt-3 border-t" :class="rule">
        <li v-for="race in snapshot?.races ?? []" :key="race.id" class="flex items-center gap-3 py-2 border-b text-sm" :class="rule">
          <span class="flex-1" :class="strong">{{ race.name }}</span>
          <MetaShareBar :percent="formatSharePercent(race.share)" :label="formatShare(race.share)" />
          <span class="tabular-nums text-xs w-16 text-right" :class="muted">{{ race.count }}</span>
        </li>
      </ul>
    </section>

    <section id="faq" class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.faq }}</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="muted">{{ copy.methodologyBody }}</p>
      <p class="mt-2 text-sm leading-relaxed" :class="muted">{{ copy.minSample }}</p>
      <p class="mt-2 text-sm font-medium" :class="strong">{{ copy.lowPopularity }}</p>
      <dl class="mt-4 space-y-4 text-sm">
        <div>
          <dt class="font-medium" :class="strong">{{ copy.faqSampleQ }}</dt>
          <dd class="mt-1" :class="muted">{{ copy.faqSampleA }}</dd>
        </div>
        <div>
          <dt class="font-medium" :class="strong">{{ copy.faqLowPopQ }}</dt>
          <dd class="mt-1" :class="muted">{{ copy.faqLowPopA }}</dd>
        </div>
      </dl>
    </section>
  </MetaShell>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { archonSpecUrl, findMetaSpec, icyVeinsGuideUrl, murlokSpecUrl, wowheadSpellUrl } from '~/utils/metaCatalog'
import { formatShare, formatSharePercent, statPriorityParts } from '~/utils/metaFormat'
import type { MetaFreshness, MetaGearCount, MetaSpecSummary } from '~/utils/metaTypes'
import { wowSpecIcon } from '~/utils/wowSpecs'

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
  data: { snapshot: MetaSpecSummary | null, freshness: MetaFreshness | null } | null
  empty: boolean
}

const { data } = await useFetch<SpecResponse>(() => `/api/v1/meta/${found.value!.classEntry.slug}/${found.value!.spec.slug}`)
const empty = computed(() => !data.value?.data?.snapshot || data.value.empty)
const snapshot = computed(() => data.value?.data?.snapshot)
const freshness = computed(() => data.value?.data?.freshness ?? null)
const crumbs = computed(() => ([
  { to: '/meta', label: copy.indexTitle },
  { to: `/meta/${found.value!.classEntry.slug}`, label: found.value!.classEntry.name },
]))
const specIcon = computed(() => wowSpecIcon(found.value!.classEntry.name, found.value!.spec.name))

const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const strong = computed(() => (isDark.value ? 'text-white' : 'text-gray-950'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))
const rule = computed(() => (isDark.value ? 'border-white/10' : 'border-gray-200'))

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
const activeId = ref('overview')
let sectionObserver: IntersectionObserver | null = null

onMounted(() => {
  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (visible?.target.id) activeId.value = visible.target.id
  }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.2, 0.5] })
  for (const item of toc) {
    const el = document.getElementById(item.id)
    if (el) sectionObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
  sectionObserver = null
})

const topBuild = computed(() => snapshot.value?.loadouts[0] ?? null)
const altBuilds = computed(() => snapshot.value?.loadouts.slice(1) ?? [])
const maxKeyLabel = computed(() => snapshot.value?.keyLevels?.max != null ? String(snapshot.value.keyLevels.max) : '—')
const statParts = computed(() => statPriorityParts(snapshot.value?.stats ?? []))

const talentTrees = computed(() => ([
  { id: 'class', title: copy.talentClass, talents: snapshot.value?.talents.class ?? [] },
  { id: 'hero', title: copy.talentHero, talents: snapshot.value?.talents.hero ?? [] },
  { id: 'spec', title: copy.talentSpec, talents: snapshot.value?.talents.spec ?? [] },
]))

function bandLabel(band: string) {
  if (band === 'core') return copy.bandCore
  if (band === 'flexible') return copy.bandFlexible
  return copy.bandRare
}

function statBarPercent(average: number) {
  const max = Math.max(1, ...(snapshot.value?.stats.map(stat => stat.average) ?? [1]))
  return Math.round((average / max) * 100)
}

const LEFT_SLOTS = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'WRIST', 'HANDS']
const RIGHT_SLOTS = ['WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2', 'MAIN_HAND', 'OFF_HAND', 'RANGED']

type SlotRow = { slot: string, item: MetaGearCount, alts: MetaGearCount[], anchor?: string }

function slotMap(): Map<string, MetaGearCount[]> {
  const map = new Map<string, MetaGearCount[]>()
  for (const group of snapshot.value?.gearSlots ?? []) map.set(group.slot, group.items)
  const rings = snapshot.value?.rings ?? []
  if (rings[0]) map.set('FINGER_1', [rings[0], ...rings.slice(2)])
  if (rings[1]) map.set('FINGER_2', [rings[1]])
  const trinkets = snapshot.value?.trinkets ?? []
  if (trinkets[0]) map.set('TRINKET_1', [trinkets[0], ...trinkets.slice(2)])
  if (trinkets[1]) map.set('TRINKET_2', [trinkets[1]])
  return map
}

function rowsFor(slots: string[]): SlotRow[] {
  const map = slotMap()
  const rows: SlotRow[] = []
  for (const slot of slots) {
    const items = map.get(slot)
    if (!items?.length) continue
    rows.push({
      slot,
      item: items[0]!,
      alts: items.slice(1),
      anchor: slot === 'TRINKET_1' ? 'trinkets' : undefined,
    })
  }
  return rows
}

const leftSlots = computed(() => rowsFor(LEFT_SLOTS))
const rightSlots = computed(() => rowsFor(RIGHT_SLOTS))
</script>
