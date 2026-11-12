<template>
  <section :aria-labelledby="headingId" class="border-t pt-4" :class="tone.rule.value">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ copy.bestBuild }}</h2>

    <template v-if="top">
      <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div v-for="stat in keyNumbers" :key="stat.label">
          <dt class="text-xs" :class="tone.muted.value">{{ stat.label }}</dt>
          <dd class="text-lg font-semibold tabular-nums" :class="tone.strong.value">{{ stat.value }}</dd>
        </div>
      </dl>

      <div class="mt-4">
        <MetaCopyCode
          :code="top.code"
          :label="copy.copyBuild"
          :copied-label="ui.copiedVisible"
          :aria-name="`${copy.topBuild}, ${formatShare(top.share)}`"
        />
      </div>

      <details v-if="alternatives.length" class="mt-4">
        <summary class="cursor-pointer text-sm underline underline-offset-4" :class="tone.strong.value">
          {{ copy.viewMore }} — {{ copy.alternatives }} ({{ alternatives.length }})
        </summary>
        <ol class="mt-3 space-y-4">
          <li v-for="(build, index) in alternatives" :key="build.code" class="border-t pt-3 text-sm" :class="tone.rule.value">
            <p class="tabular-nums" :class="tone.muted.value">
              #{{ index + 2 }} · {{ formatShare(build.share) }} · {{ ui.buildOf(build.count) }}
              <template v-if="build.heroTree"> · {{ build.heroTree.label }}</template>
            </p>
            <div class="mt-1">
              <MetaCopyCode
                :code="build.code"
                :label="copy.copyBuild"
                :copied-label="ui.copiedVisible"
                :aria-name="`build ${index + 2}, ${formatShare(build.share)}`"
              />
            </div>
          </li>
        </ol>
      </details>
    </template>
    <p v-else class="mt-3 text-sm" :class="tone.muted.value">{{ emptyText }}</p>
  </section>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { formatShare } from '~/utils/metaFormat'
import type { MetaKeyLevels, MetaLoadout } from '~/utils/metaTypes'
import { META_UI_COPY } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  loadouts: MetaLoadout[]
  sampleSize: number
  keyLevels: MetaKeyLevels | null
  /** When false, do not claim a best build (low-sample / collecting). */
  showBest?: boolean
  emptyText?: string
}>(), { showBest: true, emptyText: undefined })

const copy = META_COPY
const ui = META_UI_COPY
const tone = useMetaTone()
const headingId = `meta-build-${useId()}`
const top = computed(() => (props.showBest ? props.loadouts[0] ?? null : null))
const alternatives = computed(() => (props.showBest ? props.loadouts.slice(1, 6) : []))
const emptyText = computed(() => props.emptyText ?? copy.noSpecData)

const keyNumbers = computed(() => {
  const current = top.value
  if (!current) return []
  return [
    { label: copy.talentPopularity, value: formatShare(current.share) },
    { label: copy.heroSplit, value: current.heroTree?.label ?? '—' },
    { label: copy.maxKey, value: props.keyLevels ? String(props.keyLevels.max) : '—' },
    { label: copy.sample, value: String(props.sampleSize) },
  ]
})
</script>
