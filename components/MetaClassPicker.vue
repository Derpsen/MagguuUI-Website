<template>
  <nav :aria-labelledby="headingId">
    <h2 :id="headingId" class="font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ kl.pickClass }}</h2>
    <ul class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <li v-for="cls in pills" :key="cls.slug">
        <NuxtLink
          :to="cls.to"
          :aria-current="cls.slug === current ? 'page' : undefined"
          class="inline-flex w-full min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2"
          :class="cls.slug === current ? activePill : idlePill"
          :style="{ borderColor: cls.slug === current ? cls.hex : undefined, '--meta-cls-light': cls.textLight, '--meta-cls-dark': cls.textDark }"
        >
          <img v-if="cls.icon" :src="cls.icon" alt="" width="20" height="20" class="h-5 w-5 rounded-full" loading="lazy" decoding="async">
          <span v-else class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: cls.hex }" aria-hidden="true" />
          <span class="min-w-0 truncate text-[var(--meta-cls-light)] dark:text-[var(--meta-cls-dark)]">{{ cls.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { META_CLASSES, metaClassColor, metaClassPath, metaClassTextColor } from '~/utils/metaCatalog'
import { META_UI_COPY_KL } from '~/utils/metaUiCopy'
import { wowSpecIcon } from '~/utils/wowSpecs'

const props = withDefaults(defineProps<{
  current?: string
  hrefFor?: (slug: string) => string
}>(), { current: '', hrefFor: undefined })

const kl = META_UI_COPY_KL
const tone = useMetaTone()
const headingId = `meta-classes-${useId()}`

const pills = computed(() => META_CLASSES.map(cls => ({
  slug: cls.slug,
  label: cls.name,
  to: props.hrefFor ? props.hrefFor(cls.slug) : metaClassPath(cls.slug),
  hex: metaClassColor(cls.slug),
  textLight: metaClassTextColor(cls.slug, false),
  textDark: metaClassTextColor(cls.slug, true),
  icon: cls.specs[0] ? wowSpecIcon(cls.name, cls.specs[0].name) : null,
})))

const activePill = 'bg-transparent dark:bg-white/10'
const idlePill = 'border-gray-300 hover:border-gray-500 dark:border-white/15 dark:hover:border-white/40'
</script>
