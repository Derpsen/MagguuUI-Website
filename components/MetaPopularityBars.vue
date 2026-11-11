<template>
  <ol class="mt-3 border-t" :class="rule">
    <li
      v-for="row in rows"
      :key="row.key"
      class="flex items-center gap-3 py-1.5 border-b"
      :class="[rule, row.faded ? 'opacity-50' : '']"
    >
      <img
        v-if="row.icon"
        :src="row.icon"
        alt=""
        width="20"
        height="20"
        class="w-5 h-5 shrink-0"
        loading="lazy"
        decoding="async"
      >
      <NuxtLink
        :to="row.to"
        class="text-sm shrink-0 w-40 sm:w-48 truncate underline underline-offset-4"
        :style="{ color: row.color }"
      >{{ row.label }}</NuxtLink>
      <div class="flex-1 h-2 rounded-sm overflow-hidden min-w-0" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" role="presentation">
        <div
          class="h-full"
          :class="row.barBorder ? 'border border-gray-400' : ''"
          :style="{ width: row.percent + '%', backgroundColor: row.bar }"
        />
      </div>
      <span class="tabular-nums text-xs w-20 text-right shrink-0" :class="muted">{{ row.percentLabel }} · {{ row.n }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
defineProps<{
  rows: Array<{
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
  }>
}>()
const isDark = useIsDark()
const rule = computed(() => (isDark.value ? 'border-white/10' : 'border-gray-200'))
const muted = computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600'))
</script>
