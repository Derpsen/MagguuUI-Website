<template>
  <section :aria-labelledby="headingId">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ title || copy.gear }}</h2>
    <div v-if="columns[0].length || columns[1].length" class="mt-4 grid gap-x-8 md:grid-cols-2">
      <ul v-for="(column, ci) in columns" :key="ci" class="list-none divide-y" :class="tone.rule.value">
        <li v-for="row in column" :id="row.anchor" :key="row.key" class="py-3">
          <article :aria-label="rowAria(row)">
            <div class="flex items-start gap-3">
              <img
                v-if="iconSrc(row.items[0]!)"
                :src="iconSrc(row.items[0]!)"
                alt=""
                width="36"
                height="36"
                class="h-9 w-9 shrink-0 shadow-[inset_0_0_0_1px_var(--meta-q-light)] dark:shadow-[inset_0_0_0_1px_var(--meta-q-dark)]"
                :style="qualityStyle(row.items[0]!.quality)"
                loading="lazy"
                decoding="async"
              >
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="font-mono text-xs uppercase tracking-[0.12em]" :class="tone.label.value">{{ row.label }}</p>
                  <p class="shrink-0 text-base font-semibold tabular-nums" :class="tone.strong.value">{{ formatShare(row.items[0]!.share) }}</p>
                </div>
                <MetaTooltip
                  class="text-sm font-medium text-[var(--meta-q-light)] dark:text-[var(--meta-q-dark)]"
                  :trigger-class="'font-medium'"
                  :style="qualityStyle(row.items[0]!.quality)"
                >
                  {{ row.items[0]!.label }}
                  <template #content>
                    <span class="font-mono text-[0.65rem] uppercase tracking-[0.12em]" :class="tone.label.value">{{ row.label }}</span>
                    <span class="mt-1 block">{{ row.items[0]!.label }}</span>
                    <span class="mt-1 block tabular-nums">{{ copy.pickRate }} {{ formatShare(row.items[0]!.share) }} · {{ row.items[0]!.count }} {{ copy.parses }}</span>
                    <span v-if="metaLine(row.items[0]!).length" class="mt-1 block" :class="tone.muted.value">{{ metaLine(row.items[0]!).join(' · ') }}</span>
                  </template>
                </MetaTooltip>
                <p class="mt-0.5 text-xs" :class="tone.muted.value">
                  <template v-for="(meta, mi) in metaLine(row.items[0]!)" :key="meta">
                    <span v-if="mi" aria-hidden="true"> · </span>{{ meta }}
                  </template>
                </p>
                <p v-if="row.items[0]!.enchant || row.items[0]!.gems.length" class="mt-0.5 text-xs" :class="tone.muted.value">
                  <span v-if="row.items[0]!.enchant">{{ row.items[0]!.enchant.label }}</span>
                  <span v-if="row.items[0]!.enchant && row.items[0]!.gems.length"> · </span>
                  <span v-if="row.items[0]!.gems.length">{{ row.items[0]!.gems.map(gem => gem.label).join(', ') }}</span>
                </p>
                <MetaBar class="mt-2" :percent="formatSharePercent(row.items[0]!.share)" :label="`${copy.pickRate} ${formatShare(row.items[0]!.share)}`" />
              </div>
            </div>
            <ol v-if="row.items.length > 1" class="mt-2 space-y-1 border-t pt-2" :class="tone.rule.value">
              <li v-for="item in row.items.slice(1)" :key="item.itemId" class="flex items-baseline justify-between gap-3 text-xs">
                <MetaTooltip
                  class="min-w-0 max-w-full text-[var(--meta-q-light)] dark:text-[var(--meta-q-dark)]"
                  :style="qualityStyle(item.quality)"
                >
                  <span class="block truncate">{{ item.label }}</span>
                  <template #content>
                    <span class="font-mono text-[0.65rem] uppercase tracking-[0.12em]" :class="tone.label.value">{{ row.label }}</span>
                    <span class="mt-1 block">{{ item.label }}</span>
                    <span class="mt-1 block tabular-nums">{{ copy.pickRate }} {{ formatShare(item.share) }} · {{ item.count }} {{ copy.parses }}</span>
                    <span v-if="metaLine(item).length" class="mt-1 block" :class="tone.muted.value">{{ metaLine(item).join(' · ') }}</span>
                  </template>
                </MetaTooltip>
                <span class="shrink-0 tabular-nums" :class="tone.muted.value">{{ formatShare(item.share) }} · {{ item.count }}</span>
              </li>
            </ol>
          </article>
        </li>
      </ul>
    </div>
    <p v-else class="mt-3 text-sm" :class="tone.muted.value">{{ ui.noGear }}</p>
  </section>
</template>

<script setup lang="ts">
import { metaQualityColor } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'
import { formatShare, formatSharePercent } from '~/utils/metaFormat'
import { META_UI_COPY, META_UI_COPY_KL, blizzardIconUrl, type MetaGearCardItem, type MetaGearCardSlot } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  gearSlots: MetaGearCardSlot[]
  rings?: MetaGearCardItem[]
  trinkets?: MetaGearCardItem[]
  title?: string
  perSlot?: number
}>(), { rings: () => [], trinkets: () => [], title: '', perSlot: 3 })

const copy = META_COPY
const ui = META_UI_COPY
const kl = META_UI_COPY_KL
const tone = useMetaTone()
const headingId = `meta-gear-${useId()}`

const LEFT = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'WRIST', 'HANDS']
const RIGHT = ['WAIST', 'LEGS', 'FEET', 'FINGER', 'TRINKET', 'MAIN_HAND', 'OFF_HAND', 'RANGED']

type Row = { key: string, label: string, items: MetaGearCardItem[], anchor?: string }

function qualityStyle(quality: string | null | undefined) {
  return {
    '--meta-q-light': metaQualityColor(quality, false),
    '--meta-q-dark': metaQualityColor(quality, true),
  }
}

function mergeSlot(map: Map<string, MetaGearCardItem[]>, slot: string, items: MetaGearCardItem[]) {
  const existing = map.get(slot) ?? []
  map.set(slot, existing.concat(items))
}

const rows = computed(() => {
  const map = new Map<string, MetaGearCardItem[]>()
  for (const group of props.gearSlots) {
    const slot = group.slot.startsWith('FINGER') ? 'FINGER' : group.slot.startsWith('TRINKET') ? 'TRINKET' : group.slot
    mergeSlot(map, slot, group.items)
  }
  if (props.rings.length) mergeSlot(map, 'FINGER', props.rings)
  if (props.trinkets.length) mergeSlot(map, 'TRINKET', props.trinkets)
  const build = (slots: string[]): Row[] => slots.flatMap((slot) => {
    const items = map.get(slot)
    if (!items?.length) return []
    const limit = slot === 'FINGER' || slot === 'TRINKET' ? props.perSlot + 2 : props.perSlot
    const unique = new Map<number, MetaGearCardItem>()
    for (const item of [...items].sort((a, b) => b.share - a.share)) {
      if (!unique.has(item.itemId)) unique.set(item.itemId, item)
    }
    return [{
      key: slot,
      label: slot === 'FINGER' ? copy.rings : slot === 'TRINKET' ? copy.trinkets : (ui.slotNames[slot] ?? slot),
      items: [...unique.values()].slice(0, limit),
      anchor: slot === 'TRINKET' ? 'trinkets' : undefined,
    }]
  })
  const known = new Set([...LEFT, ...RIGHT])
  const extra = [...map.keys()].filter(slot => !known.has(slot))
  return [[...build(LEFT), ...build(extra)], build(RIGHT)] as const
})
const columns = computed(() => rows.value)

function iconSrc(item: MetaGearCardItem): string | undefined {
  return blizzardIconUrl(item.icon) ?? undefined
}

function metaLine(item: MetaGearCardItem): string[] {
  const out: string[] = []
  if (item.ilvl) out.push(`${kl.ilvl} ${item.ilvl}`)
  if (item.source) out.push(item.source)
  else if (item.crafted) out.push(kl.sourceCrafted)
  if (item.setName) out.push(`${copy.setBadge}: ${item.setName}`)
  if (item.embellished) out.push(copy.embellishments.replace(/s$/, ''))
  if (item.lowSample) out.push(ui.lowSample)
  out.push(`${item.count} ${copy.parses}`)
  return out
}

function rowAria(row: Row) {
  const top = row.items[0]
  if (!top) return row.label
  return `${row.label}: ${top.label}, ${formatShare(top.share)}`
}
</script>
