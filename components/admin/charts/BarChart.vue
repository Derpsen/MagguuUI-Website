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
  barRadius?: number
}>(), {
  height: '240px',
  color: '#3b8bff',
  emptyText: 'No data available',
  barRadius: 4,
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
      axisLabel: { color: theme.textColor, fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: theme.gridLineColor } },
      axisLabel: { color: theme.textColor, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis' as const,
      ...theme.tooltip,
    },
    series: [{
      type: 'bar' as const,
      data: props.data.map(d => d.value),
      barWidth: '60%',
      itemStyle: {
        color: props.color,
        borderRadius: [props.barRadius, props.barRadius, 0, 0],
      },
    }],
  }
})
</script>
