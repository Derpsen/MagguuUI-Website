<template>
  <div>
    <div class="flex items-start justify-between gap-3" :class="align === 'right' ? 'md:flex-row-reverse' : ''">
      <div :class="align === 'right' ? 'md:text-right' : ''">
        <p class="font-mono text-[10px] uppercase tracking-[0.12em]" :class="label">{{ slotLabel }}</p>
        <p>
          <a
            :href="wowheadItemUrl(item.itemId)"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm underline underline-offset-4"
            :style="{ color: qualityColor }"
            :title="item.name + ' — ' + formatShare(item.share)"
          >{{ item.name }}<span class="sr-only"> (opens in a new tab)</span></a>
          <span v-if="item.setName" class="ml-2 font-mono text-[10px] uppercase tracking-[0.12em]" :class="label">{{ copy.setBadge }}</span>
          <span v-if="item.crafted" class="ml-2 font-mono text-[10px] uppercase tracking-[0.12em]" :class="label">{{ copy.craftBadge }}</span>
        </p>
        <p v-if="item.enchant || item.gems.length" class="mt-0.5 text-xs" :class="muted">
          <span v-if="item.enchant">{{ item.enchant.name }}</span>
          <span v-if="item.enchant && item.gems.length"> · </span>
          <span v-if="item.gems.length">{{ item.gems.map(g => g.name).join(', ') }}</span>
        </p>
      </div>
      <p class="tabular-nums text-sm shrink-0" :class="strong">
        {{ formatShare(item.share) }}
        <span class="text-xs font-normal" :class="muted">{{ item.count }} {{ copy.parses }}</span>
      </p>
    </div>
    <ul v-if="alts.length" class="mt-1 space-y-0.5" :class="align === 'right' ? 'md:text-right' : ''">
      <li v-for="alt in alts" :key="alt.itemId" class="text-xs" :class="muted">
        <a
          :href="wowheadItemUrl(alt.itemId)"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4"
          :style="{ color: qualityColorFor(alt) }"
        >{{ alt.name }}<span class="sr-only"> (opens in a new tab)</span></a>
        <span class="tabular-nums"> {{ formatShare(alt.share) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { metaQualityColor, wowheadItemUrl } from '~/utils/metaCatalog'
import { formatShare } from '~/utils/metaFormat'
import type { MetaGearCount } from '~/utils/metaTypes'

const props = defineProps<{
  item: MetaGearCount
  alts: MetaGearCount[]
  align: 'left' | 'right'
}>()

const copy = META_COPY
const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const strong = computed(() => (isDark.value ? 'text-white' : 'text-gray-950'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))
const qualityColor = computed(() => metaQualityColor(props.item.quality, isDark.value))

function qualityColorFor(item: MetaGearCount) {
  return metaQualityColor(item.quality, isDark.value)
}

const slotLabel = computed(() => props.item.slot.replace(/_/g, ' ').replace(/FINGER/i, 'Ring').replace(/\d+$/, '').trim())
</script>
