<template>
  <section v-if="rows.length" :aria-labelledby="headingId">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.heroSplit }}</h2>
    <ul class="mt-3 grid gap-4 sm:grid-cols-2">
      <li v-for="row in rows" :key="row.id" class="border-t pt-3" :class="tone.rule.value">
        <div class="flex items-baseline justify-between gap-3">
          <h3 class="text-base font-semibold" :class="tone.strong.value">{{ row.label }}</h3>
          <p class="text-lg font-semibold tabular-nums" :class="tone.strong.value">{{ formatShare(row.share) }}</p>
        </div>
        <MetaBar class="mt-2" :percent="formatSharePercent(row.share)" :label="`${row.label}: ${formatShare(row.share)}`" />
        <p class="mt-1 text-xs tabular-nums" :class="tone.muted.value">{{ ui.buildOf(row.count) }}</p>
        <p v-if="row.topBuild" class="mt-2 text-xs" :class="tone.muted.value">
          {{ ui.heroTopBuild }}: <span class="tabular-nums">{{ formatShare(row.topBuild.share) }}</span>
          (build #{{ row.topBuildRank }})
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatShare, formatSharePercent } from '~/utils/metaFormat'
import type { MetaHeroSplit, MetaLoadout } from '~/utils/metaTypes'
import { META_UI_COPY } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  heroSplit: MetaHeroSplit[]
  loadouts?: MetaLoadout[]
}>(), { loadouts: () => [] })

const copy = META_COPY
const ui = META_UI_COPY
const tone = useMetaTone()
const headingId = `meta-hero-${useId()}`

const rows = computed(() => [...props.heroSplit]
  .sort((a, b) => b.share - a.share)
  .map((hero) => {
    const index = props.loadouts.findIndex(loadout => loadout.heroTree?.id === hero.id)
    return { ...hero, topBuild: index >= 0 ? props.loadouts[index]! : null, topBuildRank: index + 1 }
  }))
</script>
