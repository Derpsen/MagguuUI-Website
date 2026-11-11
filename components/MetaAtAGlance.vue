<template>
  <aside class="border-t pt-4 text-sm" :class="tone.rule.value" :aria-labelledby="headingId">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ ui.atAGlance }}</h2>
    <dl class="mt-3 space-y-2">
      <div v-if="topHero">
        <dt class="text-xs" :class="tone.muted.value">{{ ui.topHeroTree }}</dt>
        <dd :class="tone.strong.value">{{ topHero.label }} <span class="tabular-nums" :class="tone.muted.value">{{ formatShare(topHero.share) }}</span></dd>
      </div>
      <div v-if="statParts.length">
        <dt class="text-xs" :class="tone.muted.value">{{ copy.statPriority }}</dt>
        <dd :class="tone.strong.value">
          <template v-for="part in statParts" :key="part.name">
            <span>{{ part.name }}</span>
            <span v-if="part.symbol" class="mx-1" :class="tone.muted.value">{{ part.symbol }}</span>
          </template>
        </dd>
      </div>
      <div v-if="topTrinkets.length">
        <dt class="text-xs" :class="tone.muted.value">{{ ui.topTrinkets }}</dt>
        <dd>
          <ul>
            <li v-for="item in topTrinkets" :key="item.itemId" :class="tone.strong.value">
              {{ item.label }} <span class="tabular-nums" :class="tone.muted.value">{{ formatShare(item.share) }}</span>
            </li>
          </ul>
        </dd>
      </div>
    </dl>
    <p class="mt-3 text-xs" :class="tone.muted.value">{{ copy.lowPopularity }}</p>
  </aside>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatShare, statPriorityParts } from '~/utils/metaFormat'
import type { MetaSpecSummary } from '~/utils/metaTypes'
import { META_UI_COPY } from '~/utils/metaUiCopy'

const props = defineProps<{ spec: Pick<MetaSpecSummary, 'heroSplit' | 'stats' | 'trinkets'> }>()

const copy = META_COPY
const ui = META_UI_COPY
const tone = useMetaTone()
const headingId = `meta-glance-${useId()}`
const topHero = computed(() => [...props.spec.heroSplit].sort((a, b) => b.share - a.share)[0] ?? null)
const statParts = computed(() => statPriorityParts(props.spec.stats))
const topTrinkets = computed(() => props.spec.trinkets.slice(0, 2))
</script>
