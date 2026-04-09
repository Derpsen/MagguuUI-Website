<template>
  <div class="w-full" :style="{ height: height }">
    <VChart v-if="data.length > 1" :option="chartOption" :autoresize="true" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import VChart from 'vue-echarts'

const props = withDefaults(defineProps<{
  data: number[]
  height?: string
  color?: string
  showArea?: boolean
}>(), {
  height: '40px',
  color: '#3b8bff',
  showArea: true,
})

const chartOption = computed(() => ({
  grid: { top: 2, right: 2, bottom: 2, left: 2 },
  xAxis: { type: 'category' as const, show: false, data: props.data.map((_, i) => i) },
  yAxis: { type: 'value' as const, show: false, min: Math.min(...props.data) * 0.8 },
  tooltip: { show: false },
  series: [{
    type: 'line' as const,
    data: props.data,
    smooth: true,
    symbol: 'none',
    lineStyle: { color: props.color, width: 1.5 },
    areaStyle: props.showArea ? {
      color: {
        type: 'linear' as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: props.color + '25' },
          { offset: 1, color: props.color + '05' },
        ],
      },
    } : undefined,
  }],
}))
</script>
