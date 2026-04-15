<template>
  <div class="w-full" :style="{ height: height }">
    <div v-if="!data.length" class="h-full flex items-center justify-center text-sm"
      :class="isDark ? 'text-silver-500' : 'text-gray-400'">
      {{ emptyText }}
    </div>
    <VChart v-else :option="chartOption" :autoresize="true" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import VChart from 'vue-echarts'

interface DataPoint {
  label: string
  value: number
}

const PALETTE = ['#3b8bff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const props = withDefaults(defineProps<{
  data: DataPoint[]
  height?: string
  emptyText?: string
  centerLabel?: string
  colors?: string[]
}>(), {
  height: '220px',
  emptyText: 'No data available',
  centerLabel: '',
})

const isDark = useIsDark()

const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))
const palette = computed(() => props.colors?.length ? props.colors : PALETTE)

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'item' as const,
    backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
    borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textStyle: { color: isDark.value ? '#e2e8f0' : '#1e293b', fontSize: 12 },
    formatter: (params: { name: string, value: number, percent: number }) => `${params.name}: <b>${params.value}</b> (${params.percent}%)`,
  },
  legend: {
    bottom: 0,
    textStyle: { color: isDark.value ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)', fontSize: 11 },
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 12,
  },
  series: [{
    type: 'pie' as const,
    radius: ['52%', '78%'],
    center: ['50%', '45%'],
    avoidLabelOverlap: false,
    label: {
      show: !!props.centerLabel || total.value > 0,
      position: 'center' as const,
      formatter: () => props.centerLabel || total.value.toLocaleString(),
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: isDark.value ? '#e2e8f0' : '#1e293b',
    },
    labelLine: { show: false },
    emphasis: {
      label: { show: true, fontSize: 18, fontWeight: 'bold' as const },
      itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.15)' },
    },
    data: props.data.map((d, i) => ({
      value: d.value,
      name: d.label,
      itemStyle: { color: palette.value[i % palette.value.length] },
    })),
  }],
}))
</script>
