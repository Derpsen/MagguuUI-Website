<template>
  <MetaShell
    :title="copy.indexTitle"
    :lead="copy.indexLead"
    :empty="false"
    :empty-text="copy.empty"
    :murlok-href="META_MURLLOK_HOME"
    :archon-href="META_ARCHON_HOME"
  >
    <p v-if="noData" class="text-sm" role="status" :class="muted">{{ copy.empty }}</p>

    <section class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.classGrid }}</h2>
      <ul class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm border-t pt-3" :class="rule">
        <li v-for="cls in catalog" :key="cls.slug">
          <NuxtLink
            :to="metaClassPath(cls.slug)"
            class="underline underline-offset-4"
            :style="{ color: metaClassTextColor(cls.slug, isDark) }"
          >{{ cls.name }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.methodology }}</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="muted">{{ copy.methodologyBody }}</p>
      <p class="mt-2 text-sm leading-relaxed" :class="muted">{{ copy.minSample }}</p>
      <p class="mt-2 text-sm font-medium" :class="strong">{{ copy.lowPopularity }}</p>
    </section>

    <section class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.faqTitle }}</h2>
      <dl class="mt-3 space-y-4 text-sm">
        <div>
          <dt class="font-medium" :class="strong">{{ copy.faqSampleQ }}</dt>
          <dd class="mt-1" :class="muted">{{ copy.faqSampleA }}</dd>
        </div>
        <div>
          <dt class="font-medium" :class="strong">{{ copy.faqLowPopQ }}</dt>
          <dd class="mt-1" :class="muted">{{ copy.faqLowPopA }}</dd>
        </div>
        <div>
          <dt class="font-medium" :class="strong">{{ copy.faqSourceQ }}</dt>
          <dd class="mt-1" :class="muted">{{ copy.faqSourceA }}</dd>
        </div>
      </dl>
    </section>
  </MetaShell>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { META_ARCHON_HOME, META_CLASSES, META_MURLLOK_HOME, metaClassPath, metaClassTextColor } from '~/utils/metaCatalog'

const copy = META_COPY

usePublicPageSeo({
  title: copy.indexTitle,
  description: copy.indexLead,
  path: '/meta',
})

type MetaIndexResponse = {
  data: unknown | null
  catalog?: Array<{ slug: string, name: string, specs: Array<{ slug: string, name: string }> }>
  empty: boolean
}

const { data } = await useFetch<MetaIndexResponse>('/api/v1/meta')
const noData = computed(() => !data.value?.data || data.value.empty)
const catalog = computed(() => data.value?.catalog ?? [...META_CLASSES])
const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))
const strong = computed(() => (isDark.value ? 'text-white' : 'text-gray-950'))
const rule = computed(() => (isDark.value ? 'border-white/10' : 'border-gray-200'))
</script>
