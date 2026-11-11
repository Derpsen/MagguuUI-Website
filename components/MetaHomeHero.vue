<template>
  <section class="mt-8 border-t pt-6" :class="tone.rule.value" aria-labelledby="meta-hero-cta">
    <p class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ kl.scope }}: {{ kl.scopeMplus }} · EU</p>
    <a id="meta-hero-cta" :href="ctaHref" class="btn-primary mt-4 inline-flex items-center gap-2">
      {{ kl.heroCta }} <span aria-hidden="true">→</span>
    </a>
    <dl class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label">
        <dt class="text-xs uppercase tracking-[0.12em]" :class="tone.muted.value">{{ stat.label }}</dt>
        <dd class="mt-1 text-2xl font-semibold tabular-nums" :class="tone.strong.value">
          <time v-if="stat.datetime" :datetime="stat.datetime">{{ stat.value }}</time>
          <template v-else>{{ stat.value }}</template>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { META_CLASSES } from '~/utils/metaCatalog'
import { formatMetaFetchedAt } from '~/utils/metaSchedule'
import type { MetaFreshness } from '~/utils/metaTypes'
import { META_UI_COPY_KL, metaFetchedAtMs } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  freshness: MetaFreshness | null
  ctaHref?: string
}>(), { ctaHref: '#classes' })

const kl = META_UI_COPY_KL
const tone = useMetaTone()

const stats = computed(() => [
  { label: kl.statClasses, value: String(META_CLASSES.length), datetime: '' },
  { label: kl.statSpecs, value: String(META_CLASSES.reduce((n, cls) => n + cls.specs.length, 0)), datetime: '' },
  { label: kl.statSample, value: props.freshness ? props.freshness.players.toLocaleString('en-GB') : '—', datetime: '' },
  {
    label: kl.statUpdated,
    value: props.freshness ? (formatMetaFetchedAt(props.freshness.fetchedAt) || '—') : '—',
    datetime: props.freshness ? new Date(metaFetchedAtMs(props.freshness.fetchedAt)).toISOString() : '',
  },
])
</script>
