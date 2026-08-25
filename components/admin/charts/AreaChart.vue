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

const props = withDefaults(defineProps<{
  data: ChartDataPoint[]
  height?: string
  color?: string
  emptyText?: string
  smooth?: boolean
  showArea?: boolean
}>(), {
  height: '240px',
  color: '#3b8bff',
  emptyText: 'No data available',
  smooth: true,
  showArea: true,
})

const isDark = useIsDark()

const chartOption = computed(() => {
  const theme = createChartTheme(isDark.value)

  return {
    grid: { top: 8, right: 8, bottom: 24, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: props.data.map(d => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.textColor,
        fontSize: 11,
        interval: Math.max(0, Math.floor(props.data.length / 7) - 1),
      },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: theme.gridLineColor } },
      axisLabel: { color: theme.textColor, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis' as const,
      ...theme.tooltip,
      axisPointer: { lineStyle: { color: theme.gridLineColor } },
    },
    series: [{
      type: 'line' as const,
      data: props.data.map(d => d.value),
      smooth: props.smooth,
      symbol: 'none',
      lineStyle: { color: props.color, width: 2 },
      areaStyle: props.showArea ? {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: props.color + '30' },
            { offset: 1, color: props.color + '05' },
          ],
        },
      } : undefined,
    }],
  }
})
</script>
