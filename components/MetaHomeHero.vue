<template>
  <section class="mt-8 border-t pt-6" :class="tone.rule.value" aria-labelledby="meta-hero-cta">
    <p class="mg-kicker">{{ kl.scope }}: {{ kl.scopeMplus }} · EU</p>
    <a id="meta-hero-cta" :href="ctaHref" class="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4 hover:text-mg-fg" :class="tone.label.value">
      {{ kl.heroCta }} <span aria-hidden="true">→</span>
    </a>
    <dl class="mt-6 grid grid-cols-2 gap-4">
      <div v-for="stat in stats" :key="stat.label" :class="stat.wide ? 'col-span-2' : undefined">
        <dt class="text-xs uppercase tracking-[0.12em]" :class="tone.muted.value">{{ stat.label }}</dt>
        <dd
          class="mt-1 text-2xl font-semibold tabular-nums"
          :class="[tone.strong.value, stat.wide ? 'break-words' : 'truncate whitespace-nowrap']"
          :title="stat.value"
        >
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
  { label: kl.statClasses, value: String(META_CLASSES.length), datetime: '', wide: false },
  { label: kl.statSpecs, value: String(META_CLASSES.reduce((n, cls) => n + cls.specs.length, 0)), datetime: '', wide: false },
  { label: kl.statSample, value: props.freshness ? props.freshness.players.toLocaleString('en-GB') : '—', datetime: '', wide: false },
  {
    label: kl.statUpdated,
    value: props.freshness ? (formatMetaFetchedAt(props.freshness.fetchedAt) || '—') : '—',
    datetime: props.freshness ? new Date(metaFetchedAtMs(props.freshness.fetchedAt)).toISOString() : '',
    wide: true,
  },
])
</script>
