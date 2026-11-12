<template>
  <section :aria-labelledby="headingId">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.talents }}</h2>
    <p class="mt-2 text-xs" :class="tone.muted.value">{{ ui.heatmapLegend }}</p>

    <div v-if="hasAny" class="mt-4 grid gap-6 md:grid-cols-3">
      <div v-for="tree in trees" :key="tree.id">
        <h3 class="border-b pb-2 font-mono text-xs uppercase tracking-[0.14em]" :class="[tone.label.value, tone.rule.value]">
          {{ tree.title }} <span class="tabular-nums" :class="tone.muted.value">({{ tree.talents.length }})</span>
        </h3>
        <template v-for="band in bands" :key="band.id">
          <template v-if="tree.byBand[band.id].length">
            <p class="mt-3 font-mono text-xs uppercase tracking-[0.12em]" :class="tone.muted.value">{{ band.label }}</p>
            <ul class="mt-1 grid grid-cols-1 gap-1">
              <li
                v-for="talent in tree.byBand[band.id]"
                :key="talent.id"
                class="flex items-baseline justify-between gap-2 px-2 py-1 text-sm"
                :style="{ backgroundColor: heat(talent.share) }"
              >
                <span class="min-w-0">
                  <MetaTooltip :trigger-class="tone.strong.value">
                    {{ talent.label }}
                    <template #content>
                      <span class="font-mono text-[0.65rem] uppercase tracking-[0.12em]" :class="tone.label.value">{{ band.label }}</span>
                      <span class="mt-1 block">{{ talent.label }}</span>
                      <span class="mt-1 block tabular-nums">{{ copy.pickRate }} {{ formatShare(talent.share) }} · {{ talent.count }} {{ copy.parses }}</span>
                      <span v-if="talent.unmapped" class="mt-1 block" :class="tone.muted.value">{{ ui.unmappedNode }}</span>
                    </template>
                  </MetaTooltip>
                  <span v-if="talent.unmapped" class="ml-2 font-mono text-xs uppercase tracking-[0.12em]" :class="tone.heatMuted.value">{{ ui.unmappedNode }}</span>
                </span>
                <span class="shrink-0 text-xs tabular-nums" :class="tone.strong.value" aria-hidden="true">
                  {{ formatShare(talent.share) }} <span :class="tone.heatMuted.value">· {{ talent.count }}</span>
                </span>
              </li>
            </ul>
          </template>
        </template>
        <p v-if="!tree.talents.length" class="mt-2 text-sm" :class="tone.muted.value">—</p>
      </div>
    </div>
    <p v-else class="mt-3 text-sm" :class="tone.muted.value">{{ ui.noTalents }}</p>
  </section>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatShare } from '~/utils/metaFormat'
import type { MetaTalentBand, MetaTalentCount, MetaTalentGroups } from '~/utils/metaTypes'
import { META_UI_COPY } from '~/utils/metaUiCopy'

const props = defineProps<{ talents: MetaTalentGroups }>()

const copy = META_COPY
const ui = META_UI_COPY
const tone = useMetaTone()
const headingId = `meta-talents-${useId()}`

const bands: Array<{ id: MetaTalentBand, label: string }> = [
  { id: 'core', label: copy.bandCore },
  { id: 'flexible', label: copy.bandFlexible },
  { id: 'rare', label: copy.bandRare },
]

function group(list: MetaTalentCount[]) {
  const sorted = [...list].sort((a, b) => b.share - a.share || a.label.localeCompare(b.label))
  return {
    talents: sorted,
    byBand: {
      core: sorted.filter(talent => talent.band === 'core'),
      flexible: sorted.filter(talent => talent.band === 'flexible'),
      rare: sorted.filter(talent => talent.band === 'rare'),
    } as Record<MetaTalentBand, MetaTalentCount[]>,
  }
}

const trees = computed(() => [
  { id: 'class', title: copy.talentClass, ...group(props.talents.class) },
  { id: 'hero', title: copy.talentHero, ...group(props.talents.hero) },
  { id: 'spec', title: copy.talentSpec, ...group(props.talents.spec) },
])
const hasAny = computed(() => trees.value.some(tree => tree.talents.length))

function heat(share: number) {
  const max = tone.isDark.value ? 28 : 22
  const pct = Math.round(Math.max(0, Math.min(1, share)) * max)
  return `color-mix(in srgb, var(--color-brand-500) ${pct}%, transparent)`
}
</script>
