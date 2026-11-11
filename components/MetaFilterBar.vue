<template>
  <nav class="border-y py-3" :class="tone.rule.value" :aria-label="copy.filters">
    <dl class="flex flex-wrap gap-x-5 gap-y-1 text-sm" :class="tone.muted.value">
      <div v-for="fact in facts" :key="fact.label" class="flex gap-1.5">
        <dt :class="tone.strong.value">{{ fact.label }}</dt>
        <dd class="tabular-nums">{{ fact.value }}</dd>
      </div>
    </dl>

    <div v-for="group in groups" :key="group.id" class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      <span :id="`meta-filter-${group.id}`" class="mr-2 font-mono text-xs uppercase tracking-[0.14em]" :class="tone.label.value">{{ group.label }}</span>
      <ul class="flex flex-wrap gap-2" :aria-labelledby="`meta-filter-${group.id}`">
        <li v-for="option in group.options" :key="option.id">
          <NuxtLink
            :to="{ path: basePath, query: queryFor(group.id, option.id) }"
            :aria-current="option.active ? 'page' : undefined"
            replace
            class="inline-block rounded-full border px-3 py-1 text-xs focus-visible:outline-2"
            :class="option.active ? activeChip : idleChip"
          >{{ option.label }}</NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import type { MetaIndexGroup, MetaIndexRole } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  role: MetaIndexRole
  by: MetaIndexGroup
  season: string
  region?: string
  keyRange: string
  basePath?: string
}>(), { region: 'EU', basePath: '/meta' })

const copy = META_COPY
const tone = useMetaTone()

const facts = computed(() => [
  { label: copy.season, value: props.season },
  { label: copy.region, value: props.region },
  { label: copy.keyLevels, value: props.keyRange },
])

const groups = computed(() => [
  {
    id: 'role' as const,
    label: copy.roleFilter,
    options: ([
      ['all', copy.roleAll], ['dps', copy.roleDps], ['tank', copy.roleTank], ['healer', copy.roleHealer],
    ] as const).map(([id, label]) => ({ id, label, active: props.role === id })),
  },
  {
    id: 'by' as const,
    label: copy.groupBy,
    options: ([['spec', copy.bySpec], ['class', copy.byClass]] as const).map(([id, label]) => ({ id, label, active: props.by === id })),
  },
])

function queryFor(group: 'role' | 'by', value: string) {
  const role = group === 'role' ? value : props.role
  const by = group === 'by' ? value : props.by
  const query: Record<string, string> = {}
  if (role !== 'all') query.role = role
  if (by !== 'spec') query.by = by
  return query
}

const activeChip = computed(() => (tone.isDark.value
  ? 'border-brand-400 bg-brand-400/15 text-white'
  : 'border-brand-700 bg-brand-50 text-gray-950'))
const idleChip = computed(() => (tone.isDark.value
  ? 'border-white/15 text-silver-300 hover:border-white/40'
  : 'border-gray-300 text-gray-700 hover:border-gray-500'))
</script>
