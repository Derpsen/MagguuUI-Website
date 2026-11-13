<template>
  <section :aria-labelledby="headingId">
    <div class="flex items-baseline justify-between gap-3">
      <h2 :id="headingId" class="mg-kicker">{{ copy.popularity }}</h2>
      <p class="text-xs tabular-nums" :class="tone.muted.value">{{ ui.specsShown(rows.length) }}</p>
    </div>
    <table v-if="rows.length" class="mt-3 w-full border-collapse text-sm">
      <caption class="sr-only">{{ copy.popularity }} — {{ by === 'class' ? copy.byClass : copy.bySpec }}</caption>
      <thead class="sr-only sm:not-sr-only">
        <tr class="border-b text-left text-xs" :class="[tone.rule.value, tone.muted.value]">
          <th scope="col" class="py-1.5 pr-3 font-normal">{{ by === 'class' ? 'Class' : 'Spec' }}</th>
          <th scope="col" class="w-full py-1.5 pr-3 font-normal">{{ copy.share }}</th>
          <th scope="col" class="py-1.5 text-right font-normal">n</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key" class="border-b" :class="[tone.rule.value, row.low ? tone.lowRow.value : '']">
          <th scope="row" class="py-1.5 pr-3 text-left font-normal whitespace-nowrap">
            <span class="inline-flex items-center gap-2">
              <img v-if="row.icon" :src="row.icon" alt="" width="20" height="20" class="h-5 w-5 shrink-0" loading="lazy" decoding="async">
              <NuxtLink :to="row.to" class="underline underline-offset-4" :style="{ color: row.textColor }">{{ row.label }}</NuxtLink>
              <span v-if="row.low" class="font-mono text-xs uppercase tracking-[0.12em]" :class="tone.muted.value">{{ ui.lowSample }}</span>
            </span>
          </th>
          <td class="py-1.5 pr-3">
            <div class="flex items-center gap-2">
              <MetaBar class="flex-1" :percent="row.barPercent" :color="row.barColor" :outline="row.outline" :label="`${row.label}: ${row.shareLabel}`" />
              <span class="w-12 shrink-0 text-right tabular-nums" :class="tone.strong.value">{{ row.shareLabel }}</span>
            </div>
          </td>
          <td class="py-1.5 text-right tabular-nums" :class="tone.muted.value">{{ row.n }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="mt-3 text-sm" :class="tone.muted.value">{{ copy.empty }}</p>
  </section>
</template>

<script setup lang="ts">
import { metaClassColor, metaClassPath, metaClassTextColor, metaSpecPath, metaSpecRole } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'
import { formatShare } from '~/utils/metaFormat'
import { META_MIN_BUILD_SAMPLE, type MetaClassSummary } from '~/utils/metaTypes'
import { META_UI_COPY, type MetaIndexGroup, type MetaIndexRole } from '~/utils/metaUiCopy'
import { wowSpecIcon } from '~/utils/wowSpecs'

const props = defineProps<{
  classes: MetaClassSummary[]
  role: MetaIndexRole
  by: MetaIndexGroup
}>()

const copy = META_COPY
const ui = META_UI_COPY
const tone = useMetaTone()
const headingId = `meta-index-${useId()}`

type Row = {
  key: string
  to: string
  label: string
  icon: string | null
  textColor: string
  barColor: string
  outline: boolean
  share: number
  shareLabel: string
  barPercent: number
  n: number
  low: boolean
}

const rows = computed<Row[]>(() => {
  const dark = tone.isDark.value
  const total = props.classes.reduce((sum, cls) => sum + cls.n, 0) || 1
  const base = (slug: string) => {
    const hex = metaClassColor(slug)
    return {
      textColor: metaClassTextColor(slug, dark),
      barColor: hex,
      outline: !dark && ['#ffffff', '#fff468'].includes(hex.toLowerCase()),
    }
  }
  let list: Omit<Row, 'barPercent'>[]
  if (props.by === 'class') {
    list = props.classes
      .filter(cls => props.role === 'all' || cls.specs.some(spec => metaSpecRole(cls.slug, spec.slug) === props.role))
      .map(cls => ({
        key: cls.slug,
        to: metaClassPath(cls.slug),
        label: cls.label,
        icon: null,
        ...base(cls.slug),
        share: cls.n / total,
        shareLabel: formatShare(cls.n / total),
        n: cls.n,
        low: cls.n < META_MIN_BUILD_SAMPLE,
      }))
  } else {
    list = props.classes.flatMap(cls => cls.specs
      .filter(spec => props.role === 'all' || metaSpecRole(cls.slug, spec.slug) === props.role)
      .map(spec => ({
        key: `${cls.slug}/${spec.slug}`,
        to: metaSpecPath(cls.slug, spec.slug),
        label: `${spec.label} ${cls.label}`,
        icon: wowSpecIcon(cls.label, spec.label) || null,
        ...base(cls.slug),
        share: spec.share,
        shareLabel: formatShare(spec.share),
        n: spec.n,
        low: spec.lowSample || spec.collecting || spec.empty,
      })))
  }
  list.sort((a, b) => b.share - a.share || a.label.localeCompare(b.label))
  const max = list[0]?.share || 1
  return list.map(row => ({ ...row, barPercent: Math.round((row.share / max) * 100) }))
})
</script>
