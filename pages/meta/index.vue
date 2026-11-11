<template>
  <MetaShell
    :title="copy.indexTitle"
    :lead="copy.indexLead"
    :empty="false"
    :empty-text="copy.empty"
    :murlok-href="META_MURLLOK_HOME"
    :archon-href="META_ARCHON_HOME"
  >
    <template #intro>
      <MetaFreshness :freshness="freshness" />
    </template>

    <p v-if="noData" class="text-sm" role="status" :class="muted">{{ copy.empty }}</p>

    <div class="meta-index-filters mt-8 border-y py-3" :class="rule">
      <p class="font-mono text-[11px] uppercase tracking-[0.14em] mb-2" :class="label">{{ copy.filters }}</p>
      <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <p :class="muted"><span :class="strong">{{ copy.season }}</span> {{ seasonLabel }}</p>
        <p :class="muted"><span :class="strong">{{ copy.region }}</span> EU</p>
        <p :class="muted"><span :class="strong">{{ copy.keyLevels }}</span> {{ keyLabel }}</p>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.roleFilter }}</span>
        <label v-for="role in roles" :key="role.id" class="inline-flex items-center gap-1.5 cursor-pointer">
          <input :id="'role-' + role.id" v-model="roleFilter" type="radio" name="meta-role" class="accent-brand-500" :value="role.id">
          {{ role.label }}
        </label>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.groupBy }}</span>
        <label class="inline-flex items-center gap-1.5 cursor-pointer">
          <input v-model="groupBy" type="radio" name="meta-group" class="accent-brand-500" value="spec">
          {{ copy.bySpec }}
        </label>
        <label class="inline-flex items-center gap-1.5 cursor-pointer">
          <input v-model="groupBy" type="radio" name="meta-group" class="accent-brand-500" value="class">
          {{ copy.byClass }}
        </label>
      </div>
    </div>

    <section class="mt-8">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.popularity }}</h2>
      <MetaPopularityBars :rows="visibleRows" />
    </section>

    <section class="mt-10">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="label">{{ copy.classGrid }}</h2>
      <ul class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm border-t pt-3" :class="rule">
        <li v-for="cls in catalog" :key="cls.slug">
          <NuxtLink :to="metaClassPath(cls.slug)" class="underline underline-offset-4" :style="{ color: metaClassTextColor(cls.slug, isDark) }">{{ cls.name }}</NuxtLink>
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
import { META_ARCHON_HOME, META_CLASSES, META_MURLLOK_HOME, metaClassColor, metaClassPath, metaClassTextColor, metaSpecPath, metaSpecRole, type MetaRole } from '~/utils/metaCatalog'
import { formatShare, formatSharePercent } from '~/utils/metaFormat'
import type { MetaClassSummary, MetaFreshness } from '~/utils/metaTypes'
import { wowSpecIcon } from '~/utils/wowSpecs'

const copy = META_COPY

usePublicPageSeo({
  title: copy.indexTitle,
  description: copy.indexDescription,
  path: '/meta',
})

type MetaIndexResponse = {
  data: { classes: MetaClassSummary[], freshness: MetaFreshness, season: { id: number, name: string } | null } | null
  catalog: Array<{ slug: string, name: string }>
  empty: boolean
}

const { data } = await useFetch<MetaIndexResponse>('/api/v1/meta')
const noData = computed(() => !data.value?.data || data.value.empty || !data.value.data.classes.length)
const freshness = computed(() => data.value?.data?.freshness ?? null)
const catalog = computed(() => data.value?.catalog ?? META_CLASSES)
const seasonLabel = computed(() => data.value?.data?.season?.name || '—')
const keyLabel = computed(() => {
  const range = freshness.value?.keyLevels
  if (!range) return '—'
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`
})

const roles = [
  { id: 'all' as const, label: copy.roleAll },
  { id: 'dps' as const, label: copy.roleDps },
  { id: 'tank' as const, label: copy.roleTank },
  { id: 'healer' as const, label: copy.roleHealer },
]
const roleFilter = ref<'all' | MetaRole>('all')
const groupBy = ref<'spec' | 'class'>('spec')

type PopRow = {
  key: string
  to: string
  label: string
  color: string
  bar: string
  barBorder?: boolean
  percent: number
  percentLabel: string
  n: number
  icon?: string | null
  faded?: boolean
  role: MetaRole | 'mixed'
}

const isDark = useIsDark()
const label = computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700'))
const strong = computed(() => (isDark.value ? 'text-white' : 'text-gray-950'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))
const rule = computed(() => (isDark.value ? 'border-white/10' : 'border-gray-200'))

const specRows = computed((): PopRow[] => {
  const classes = data.value?.data?.classes ?? []
  const rows: PopRow[] = []
  for (const cls of classes) {
    for (const spec of cls.specs) {
      const hex = metaClassColor(cls.slug)
      rows.push({
        key: `${cls.slug}/${spec.slug}`,
        to: metaSpecPath(cls.slug, spec.slug),
        label: `${spec.name} ${cls.name}`,
        color: metaClassTextColor(cls.slug, isDark.value),
        bar: hex,
        barBorder: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff468',
        percent: formatSharePercent(spec.share),
        percentLabel: formatShare(spec.share),
        n: spec.characterCount,
        icon: wowSpecIcon(cls.name, spec.name),
        faded: spec.belowMinSample,
        role: metaSpecRole(cls.slug, spec.slug),
      })
    }
  }
  return rows.sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label))
})

const classRows = computed((): PopRow[] => {
  const classes = data.value?.data?.classes ?? []
  const total = Math.max(1, freshness.value?.characters || classes.reduce((sum, cls) => sum + cls.characterCount, 0))
  return classes.map((cls) => {
    const hex = metaClassColor(cls.slug)
    const share = cls.characterCount / total
    const rolesInClass = new Set(cls.specs.map(spec => metaSpecRole(cls.slug, spec.slug)))
    return {
      key: cls.slug,
      to: metaClassPath(cls.slug),
      label: cls.name,
      color: metaClassTextColor(cls.slug, isDark.value),
      bar: hex,
      barBorder: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff468',
      percent: formatSharePercent(share),
      percentLabel: formatShare(share),
      n: cls.characterCount,
      faded: cls.characterCount < 20,
      role: rolesInClass.size === 1 ? [...rolesInClass][0]! : 'mixed' as const,
    }
  }).sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label))
})

const visibleRows = computed(() => {
  const rows = groupBy.value === 'class' ? classRows.value : specRows.value
  if (roleFilter.value === 'all') return rows
  return rows.filter(row => row.role === roleFilter.value || row.role === 'mixed')
})
</script>
