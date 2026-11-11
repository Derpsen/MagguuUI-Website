<template>
  <div class="space-y-3">
    <nav :aria-labelledby="specLabelId" class="flex flex-wrap items-center gap-2">
      <span :id="specLabelId" class="mr-1 font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ kl.switchSpec }}</span>
      <NuxtLink
        v-for="spec in specs"
        :key="spec.slug"
        :to="spec.to"
        :aria-current="spec.slug === specSlug ? 'page' : undefined"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm focus-visible:outline-2"
        :class="spec.slug === specSlug ? active : idle"
      >
        <img v-if="spec.icon" :src="spec.icon" alt="" width="20" height="20" class="h-5 w-5 rounded-full" loading="lazy" decoding="async">
        {{ spec.label }}
      </NuxtLink>
    </nav>

    <nav v-if="heroSplit.length > 1" :aria-labelledby="heroLabelId" class="flex flex-wrap items-center gap-2">
      <span :id="heroLabelId" class="mr-1 font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ kl.heroToggle }}</span>
      <NuxtLink
        v-for="opt in heroOptions"
        :key="opt.key"
        :to="opt.to"
        replace
        :aria-current="opt.active ? 'true' : undefined"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm focus-visible:outline-2"
        :class="opt.active ? active : idle"
      >
        {{ opt.label }}<span v-if="opt.share" class="tabular-nums" :class="tone.muted.value">{{ opt.share }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { findMetaClass, metaSpecPath } from '~/utils/metaCatalog'
import { formatShare } from '~/utils/metaFormat'
import type { MetaHeroSplit } from '~/utils/metaTypes'
import { META_UI_COPY_KL } from '~/utils/metaUiCopy'
import { wowSpecIcon } from '~/utils/wowSpecs'

const props = withDefaults(defineProps<{
  classSlug: string
  specSlug: string
  heroSplit?: MetaHeroSplit[]
  activeHeroId?: number | null
}>(), { heroSplit: () => [], activeHeroId: null })

const kl = META_UI_COPY_KL
const tone = useMetaTone()
const uid = useId()
const specLabelId = `meta-spec-sw-${uid}`
const heroLabelId = `meta-hero-sw-${uid}`

const specs = computed(() => {
  const cls = findMetaClass(props.classSlug)
  if (!cls) return []
  return cls.specs.map(spec => ({
    slug: spec.slug,
    label: spec.name,
    to: metaSpecPath(cls.slug, spec.slug),
    icon: wowSpecIcon(cls.name, spec.name),
  }))
})

const heroOptions = computed(() => {
  const path = metaSpecPath(props.classSlug, props.specSlug)
  return [
    { key: 'all', label: kl.heroAll, share: '', to: { path }, active: props.activeHeroId == null },
    ...[...props.heroSplit].sort((a, b) => b.share - a.share).map(hero => ({
      key: String(hero.id),
      label: hero.label,
      share: formatShare(hero.share),
      to: { path, query: { hero: String(hero.id) } },
      active: props.activeHeroId === hero.id,
    })),
  ]
})

const active = computed(() => (tone.isDark.value ? 'border-brand-400 bg-brand-400/15 text-white' : 'border-brand-700 bg-brand-50 text-gray-950'))
const idle = computed(() => (tone.isDark.value ? 'border-white/15 text-silver-300 hover:border-white/40' : 'border-gray-300 text-gray-700 hover:border-gray-500'))
</script>
