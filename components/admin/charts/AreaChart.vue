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

const props = withDefaults(defineProps<{
  data: DataPoint[]
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
  const textColor = isDark.value ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
  const gridLineColor = isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'

  return {
    grid: { top: 8, right: 8, bottom: 24, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: props.data.map(d => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        interval: Math.max(0, Math.floor(props.data.length / 7) - 1),
      },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { color: textColor, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
      borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      textStyle: { color: isDark.value ? '#e2e8f0' : '#1e293b', fontSize: 12 },
      axisPointer: { lineStyle: { color: gridLineColor } },
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
