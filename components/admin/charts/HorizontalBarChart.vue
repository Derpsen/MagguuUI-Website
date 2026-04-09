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

interface DataPoint {
  label: string
  value: number
}

const props = withDefaults(defineProps<{
  data: DataPoint[]
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
  const textColor = isDark.value ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)'
  const gridLineColor = isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
  const reversed = [...props.data].reverse()

  return {
    grid: { top: 4, right: 40, bottom: 4, left: 120 },
    xAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'category' as const,
      data: reversed.map(d => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        width: 110,
        overflow: 'truncate' as const,
      },
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
      borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      textStyle: { color: isDark.value ? '#e2e8f0' : '#1e293b', fontSize: 12 },
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
        color: textColor,
        fontSize: 11,
        formatter: (params: any) => params.value.toLocaleString(),
      },
    }],
  }
})
</script>
