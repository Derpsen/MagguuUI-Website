<template>
  <div data-meta-below-fold :data-hydrated="hydrated ? 'true' : undefined">
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

    <AdSlot class="mt-12" placement="after-build" />

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

    <MetaClassPicker class="mt-12" :current="classSlug" />

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
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatShare, formatSharePercent } from '~/utils/metaFormat'
import type { MetaSpecSummary, MetaTalentGroups } from '~/utils/metaTypes'

const props = defineProps<{
  spec: MetaSpecSummary
  talents: MetaTalentGroups
  classSlug: string
}>()

const copy = META_COPY
const tone = useMetaTone()
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const enchantLists = computed(() => [
  { title: copy.enchants, rows: props.spec.enchants ?? [] },
  { title: copy.gems, rows: props.spec.gems ?? [] },
])

const faq = [
  { q: copy.faqSampleQ, a: copy.faqSampleA },
  { q: copy.faqLowPopQ, a: copy.faqLowPopA },
  { q: copy.faqSourceQ, a: copy.faqSourceA },
]

function statPercent(average: number) {
  const max = Math.max(1, ...(props.spec.stats.map(stat => stat.average) ?? [1]))
  return Math.round((average / max) * 100)
}
</script>
