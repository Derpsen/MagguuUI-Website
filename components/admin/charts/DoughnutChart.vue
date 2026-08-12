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
import { createChartTheme, type ChartDataPoint } from '~/utils/chartTheme'

const PALETTE = ['#3b8bff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const props = withDefaults(defineProps<{
  data: ChartDataPoint[]
  height?: string
  emptyText?: string
  centerLabel?: string
  colors?: string[]
}>(), {
  height: '220px',
  emptyText: 'No data available',
  centerLabel: '',
  colors: () => [],
})

const isDark = useIsDark()

const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))
const palette = computed(() => props.colors?.length ? props.colors : PALETTE)

const chartOption = computed(() => {
  const theme = createChartTheme(isDark.value, 0.8)
  return {
    tooltip: {
      trigger: 'item' as const,
      ...theme.tooltip,
      formatter: (params: { name: string, value: number, percent: number }) => `${params.name}: <b>${params.value}</b> (${params.percent}%)`,
    },
    legend: {
      bottom: 0,
      textStyle: { color: theme.textColor, fontSize: 11 },
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
        color: theme.primaryTextColor,
      },
      labelLine: { show: false },
      emphasis: {
        label: { show: true, fontSize: 18, fontWeight: 'bold' as const },
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.15)' },
      },
      data: props.data.map((dataPoint, index) => ({
        value: dataPoint.value,
        name: dataPoint.label,
        itemStyle: { color: palette.value[index % palette.value.length] },
      })),
    }],
  }
})
</script>
