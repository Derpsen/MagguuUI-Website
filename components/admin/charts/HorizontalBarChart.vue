<template>
  <div class="w-full" :style="{ height: computedHeight }">
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
  barRadius?: number
}>(), {
  height: '',
  color: '#3b8bff',
  emptyText: 'No data available',
  barRadius: 4,
})

const isDark = useIsDark()

const computedHeight = computed(() => props.height || `${Math.max(120, props.data.length * 36)}px`)

const chartOption = computed(() => {
  const theme = createChartTheme(isDark.value, 0.8)
  const reversed = [...props.data].reverse()

  return {
    grid: { top: 4, right: 40, bottom: 4, left: 120 },
    xAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: theme.gridLineColor } },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'category' as const,
      data: reversed.map(d => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.textColor,
        fontSize: 11,
        width: 110,
        overflow: 'truncate' as const,
      },
    },
    tooltip: {
      trigger: 'axis' as const,
      ...theme.tooltip,
    },
    series: [{
      type: 'bar' as const,
      data: reversed.map(d => d.value),
      barWidth: '55%',
      itemStyle: {
        color: props.color,
        borderRadius: [0, props.barRadius, props.barRadius, 0],
      },
      label: {
        show: true,
        position: 'right' as const,
        color: theme.textColor,
        fontSize: 11,
        formatter: (params: { value: number }) => params.value.toLocaleString(),
      },
    }],
  }
})
</script>
